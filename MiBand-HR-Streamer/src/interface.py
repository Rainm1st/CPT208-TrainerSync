from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator, Optional

from bleak import BleakClient

from .auth import MiBandAuth
from .config import MiBandConfig
from .filter import FilterChain
from .monitor import HeartRateMonitor
from .reconnector import Reconnector

logger = logging.getLogger(__name__)


class MiBandHRCollector:
    """小米手环心率拉取接口（高层封装）。

    整合 认证 → 监控 → 滤波 → 重连 → 数据输出 全流程，
    对外提供简单的 ``async for`` 流式接口。

    使用方式:
        async with MiBandHRCollector(mac="AB:CD:...", key="0xa3c1...") as collector:
            async for data in collector.stream():
                print(data["heart_rate"])
    """

    def __init__(
        self,
        mac_address: str,
        auth_key: str,
        config: Optional[MiBandConfig] = None,
    ) -> None:
        """
        Args:
            mac_address: 手环 BLE MAC 地址。
            auth_key: huami-token 提取的 32 字符十六进制 Auth Key。
            config: 可选自定义配置，未提供则使用默认值。
        """
        self._config = config or MiBandConfig(
            mac_address=mac_address, auth_key=auth_key
        )
        self._mac = mac_address
        self._auth_key = auth_key

        self._auth: Optional[MiBandAuth] = None
        self._monitor: Optional[HeartRateMonitor] = None
        self._reconnector: Optional[Reconnector] = None
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._filter: Optional[FilterChain] = None
        self._running = False
        self._tcp_server: Optional[asyncio.AbstractServer] = None
        self._tcp_clients: list[asyncio.StreamWriter] = []

    # ── 上下文管理器 ──────────────────────────────────────────────────

    async def __aenter__(self) -> MiBandHRCollector:
        await self.start()
        return self

    async def __aexit__(self, *args: Any) -> None:
        await self.stop()

    # ── 启动 / 停止 ──────────────────────────────────────────────────

    async def start(self) -> None:
        """一键启动：连接 → 认证 → 开启心率监控。"""
        errors = self._config.validate()
        if errors:
            raise ValueError("配置校验失败: " + "; ".join(errors))

        # 初始化滤波器
        if self._config.filter_window_size > 1:
            self._filter = FilterChain.default(self._config.filter_window_size)

        # 连接 + 认证
        self._auth = MiBandAuth(self._mac, self._auth_key)
        client = await self._auth.connect_and_authenticate()

        # 启动心率监控
        await self._start_monitor(client)

        # 初始化重连器
        self._init_reconnector()

        # 可选 TCP 数据输出
        if self._config.enable_websocket:
            await self._start_tcp_server()

        self._running = True
        logger.info("MiBandHRCollector 启动完成")

    async def stop(self) -> None:
        """停止所有后台任务并断开连接。"""
        self._running = False

        # 停止 TCP 服务器
        if self._tcp_server:
            self._tcp_server.close()
            self._tcp_server = None

        # 停止重连器
        if self._reconnector:
            await self._reconnector.stop()

        # 停止监控
        if self._monitor:
            await self._monitor.stop()

        # 断开 BLE
        if self._auth:
            await self._auth.disconnect()

        logger.info("MiBandHRCollector 已停止")

    # ── 数据流 ────────────────────────────────────────────────────────

    async def stream(self, filtered: bool = True) -> AsyncIterator[dict[str, Any]]:
        """异步迭代心率数据流。

        Args:
            filtered: 是否应用滤波处理。

        每个数据包格式:
            {
                "heart_rate": 72,           # bpm
                "contact_status": True,
                "contact_supported": True,
                "timestamp": 1234567890.123, # time.time()
                "datetime": "2026-05-06T10:45:01.234567",
            }
            (可能还包含 energy_expended, rr_intervals)
        """
        while self._running or not self._queue.empty():
            try:
                data = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            if filtered and self._filter:
                data["heart_rate_raw"] = data["heart_rate"]
                data["heart_rate"] = round(
                    self._filter.update(float(data["heart_rate"]))
                )

            yield data

    # ── 内部方法 ──────────────────────────────────────────────────────

    async def _start_monitor(self, client: BleakClient) -> None:
        """启动心率监控。"""
        self._monitor = HeartRateMonitor(
            client=client,
            data_queue=self._queue,
            on_status=self._on_monitor_status,
        )
        await self._monitor.start()

    def _init_reconnector(self) -> None:
        """初始化重连器。"""
        self._reconnector = Reconnector(
            mac_address=self._mac,
            auth_key=self._auth_key,
            max_attempts=self._config.max_reconnect_attempts,
            base_delay=self._config.reconnect_base_delay,
            max_delay=self._config.reconnect_max_delay,
        )

        async def _on_reconnect(client: BleakClient) -> None:
            """重连后恢复心率监控。"""
            await self._start_monitor(client)

        self._reconnector.on_reconnected = _on_reconnect
        self._reconnector.on_failed = lambda exc: logger.critical(
            "重连彻底失败: %s", exc
        )

    def _on_monitor_status(self, status: str) -> None:
        """心率监控状态变化回调。"""
        if status == "disconnected" and self._config.auto_reconnect and self._reconnector:
            logger.info("触发自动重连...")
            asyncio.create_task(self._auto_reconnect())

    async def _auto_reconnect(self) -> None:
        """自动重连流程：等待重连器完成 → 恢复数据流。"""
        try:
            await self._reconnector.run(self._auth)
        except RuntimeError as e:
            logger.critical("自动重连失败: %s", e)

    # ── TCP 数据广播 (轻量替代 WebSocket) ────────────────────────────

    async def _start_tcp_server(self) -> None:
        """启动 TCP 服务器广播心率数据。"""
        try:
            self._tcp_server = await asyncio.start_server(
                self._handle_tcp_client,
                host=self._config.websocket_host,
                port=self._config.websocket_port,
            )
            logger.info(
                "TCP 数据服务器已启动: %s:%d",
                self._config.websocket_host,
                self._config.websocket_port,
            )
        except Exception as e:
            logger.warning("TCP 服务器启动失败: %s", e)

    async def _handle_tcp_client(
        self,
        reader: asyncio.StreamReader,
        writer: asyncio.StreamWriter,
    ) -> None:
        """处理单条 TCP 连接：持续推送心率数据。"""
        self._tcp_clients.append(writer)
        addr = writer.get_extra_info("peername")
        logger.debug("TCP 客户端已连接: %s", addr)

        try:
            async for data in self.stream(filtered=True):
                line = json.dumps(data, default=str) + "\n"
                try:
                    writer.write(line.encode("utf-8"))
                    await writer.drain()
                except Exception:
                    break
        finally:
            self._tcp_clients.remove(writer)
            try:
                writer.close()
            except Exception:
                pass
            logger.debug("TCP 客户端已断开: %s", addr)

    # ── 属性 ──────────────────────────────────────────────────────────

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def is_connected(self) -> bool:
        return self._auth is not None and self._auth.is_connected
