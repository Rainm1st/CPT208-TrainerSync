from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable, Optional

from bleak import BleakClient

from .auth import MiBandAuth

logger = logging.getLogger(__name__)


class Reconnector:
    """BLE 断线自动重连机制，使用指数退避。

    负责:
      1. 监控连接状态
      2. 断线后自动重连 + 重新认证
      3. 通过回调通知上层"已重连"
    """

    def __init__(
        self,
        mac_address: str,
        auth_key: str,
        max_attempts: int = 5,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
    ) -> None:
        self._mac = mac_address
        self._auth_key = auth_key
        self._max_attempts = max_attempts
        self._base_delay = base_delay
        self._max_delay = max_delay

        self._auth: Optional[MiBandAuth] = None
        self._running = False
        self._attempt = 0

        # 外部注入的回调
        self.on_reconnected: Optional[Callable[[BleakClient], Awaitable[None]]] = None
        """重连成功后调用，用于让上层重新订阅通知等。"""

        self.on_failed: Optional[Callable[[Exception], None]] = None
        """所有重连尝试均失败后调用。"""

    # ── 生命周期 ──────────────────────────────────────────────────────

    async def run(
        self,
        initial_auth: MiBandAuth,
    ) -> BleakClient:
        """从已建立的连接开始，在断线时自动重连。

        返回第一个成功连接的 BleakClient。
        若初始连接已断开，立即触发重连。
        """
        self._auth = initial_auth
        self._running = True
        self._attempt = 0

        # 如果初始连接是通的，直接成功
        if initial_auth.is_connected:
            return initial_auth.client

        # 否则开始重连循环
        return await self._reconnect_loop()

    async def stop(self) -> None:
        """停止重连循环。"""
        self._running = False

    # ── 重连循环 ──────────────────────────────────────────────────────

    async def _reconnect_loop(self) -> BleakClient:
        """指数退避重连循环。"""
        while self._running and self._attempt < self._max_attempts:
            self._attempt += 1
            delay = self._backoff_delay()

            logger.warning(
                "重连尝试 %d/%d，等待 %.1fs ...",
                self._attempt,
                self._max_attempts,
                delay,
            )

            await asyncio.sleep(delay)

            try:
                client = await self._try_reconnect()
                self._attempt = 0
                logger.info("重连并认证成功！")
                return client
            except Exception as e:
                logger.error("重连失败 (尝试 %d/%d): %s", self._attempt, self._max_attempts, e)

        # 所有尝试耗尽
        exc = RuntimeError(
            f"重连失败，已尝试 {self._max_attempts} 次"
        )
        if self.on_failed:
            self.on_failed(exc)
        raise exc

    async def _try_reconnect(self) -> BleakClient:
        """单次重连：断开旧连接 → 重新认证。"""
        # 清理旧连接
        if self._auth and self._auth.client:
            try:
                await self._auth.client.disconnect()
            except Exception:
                pass

        # 重新认证 (connect + authenticate)
        self._auth = MiBandAuth(self._mac, self._auth_key)
        client = await self._auth.connect_and_authenticate()

        # 通知上层恢复注册
        if self.on_reconnected:
            await self.on_reconnected(client)

        return client

    def _backoff_delay(self) -> float:
        """指数退避计算。"""
        delay = self._base_delay * (2 ** (self._attempt - 1))
        return min(delay, self._max_delay)

    # ── 状态 ──────────────────────────────────────────────────────────

    @property
    def attempt(self) -> int:
        return self._attempt

    @property
    def is_running(self) -> bool:
        return self._running
