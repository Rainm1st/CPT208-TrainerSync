from __future__ import annotations

import asyncio
import logging
import struct
import time
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from bleak import BleakClient

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# 心率数据格式 (BLE 标准 0x2A37)
# ──────────────────────────────────────────────────────────────────────
#
# Byte 0 — Flags
#   Bit 0: HR 值格式       0 = uint8,  1 = uint16
#   Bit 1: 接触状态        0 = 无接触, 1 = 有接触
#   Bit 2: 接触传感器      0 = 不支持, 1 = 支持
#   Bit 3: 能耗            0 = 无,     1 = 存在 (2 字节)
#   Bit 4: RR-Interval     0 = 无,     1 = 存在 (2 字节 × N)
#
# Byte 1+ — HR 值 (uint8 或 uint16)
# 可选 — Energy Expended (uint16)
# 可选 — RR-Intervals (uint16 × N, 单位 1/1024 s)
#

HR_CONTROL_CMDS = {
    "continuous": b"\x15\x01\x01",
    "single": b"\x15\x02\x01",
    "stop": b"\x15\x01\x00",
}


class HeartRateMonitor:
    """心率数据订阅与解析。

    负责:
      1. 订阅 0x2A37 心率测量通知
      2. 通过 0x000e 开启持续心率模式
      3. 解析 BLE 心率包并添加微秒级时间戳
      4. 通过回调 / asyncio.Queue 输出数据
    """

    _HR_MEASUREMENT_CHAR = "00002a37-0000-1000-8000-00805f9b34fb"
    _HR_CONTROL_CHAR = "0000000e-0000-1000-8000-00805f9b34fb"

    def __init__(
        self,
        client: BleakClient,
        data_queue: asyncio.Queue[dict[str, Any]],
        on_status: Optional[Callable[[str], None]] = None,
    ) -> None:
        """
        Args:
            client: 已认证的 BleakClient。
            data_queue: 解析后的心率数据放入此队列。
            on_status: 可选状态回调，用于通知连接/重连状态。
        """
        self._client = client
        self._queue = data_queue
        self._on_status = on_status
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._hr_control_char: Optional[str] = None

    # ── 生命周期 ──────────────────────────────────────────────────────

    async def start(self) -> None:
        """启动心率监控：注册通知 + 开启持续心率模式。"""
        if self._running:
            return
        self._running = True

        # 校验连接
        if not self._client.is_connected:
            raise RuntimeError("BLE 未连接，无法启动心率监控")

        # 订阅心率测量通知
        await self._client.start_notify(
            self._HR_MEASUREMENT_CHAR, self._on_hr_notify
        )
        logger.info("已订阅心率测量通知 (0x2A37)")

        # 开启持续心率模式
        await self._enable_continuous_hr()

        self._task = asyncio.create_task(self._watch_disconnect())
        logger.info("持续心率监控已开启")

    async def stop(self) -> None:
        """停止心率监控：关闭通知 → 停止心率测量。"""
        if not self._running:
            return
        self._running = False

        if self._task:
            self._task.cancel()
            self._task = None

        try:
            await self._stop_continuous_hr()
        except Exception:
            pass

        try:
            await self._client.stop_notify(self._HR_MEASUREMENT_CHAR)
        except Exception:
            pass

        logger.info("心率监控已停止")

    # ── 心率控制 ──────────────────────────────────────────────────────

    async def _enable_continuous_hr(self) -> None:
        """通过小米私有特征值开启持续心率模式。

        写入 0x000e: \x15\x01\x01  = 开启连续测量
        """
        try:
            await self._client.write_gatt_char(
                self._HR_CONTROL_CHAR,
                HR_CONTROL_CMDS["continuous"],
                response=True,
            )
            logger.debug("已发送持续心率开启指令")
        except Exception as e:
            logger.warning("开启持续心率模式失败: %s", e)

    async def _stop_continuous_hr(self) -> None:
        """关闭持续心率模式。"""
        try:
            await self._client.write_gatt_char(
                self._HR_CONTROL_CHAR,
                HR_CONTROL_CMDS["stop"],
                response=True,
            )
        except Exception:
            pass

    # ── 数据解析 ──────────────────────────────────────────────────────

    def _on_hr_notify(self, _sender: int, data: bytearray) -> None:
        """心率通知回调：解析并推入队列。"""
        if not self._running:
            return

        try:
            packet = self._parse_hr_data(data)
            packet["timestamp"] = time.time()
            packet["datetime"] = datetime.now(timezone.utc).isoformat(timespec="microseconds")
            self._queue.put_nowait(packet)
        except Exception as e:
            logger.warning("心率数据解析失败: %s", e)

    @staticmethod
    def _parse_hr_data(data: bytearray) -> dict[str, Any]:
        """解析 BLE 心率测量数据包。"""
        if len(data) < 2:
            return {"heart_rate": 0, "contact_status": False}

        flags = data[0]
        index = 1

        # HR 值 (uint8 或 uint16)
        if flags & 0x01:
            hr_value = struct.unpack_from("<H", data, index)[0]
            index += 2
        else:
            hr_value = data[index]
            index += 1

        result: dict[str, Any] = {
            "heart_rate": hr_value,
            "contact_status": bool(flags & 0x02),
            "contact_supported": bool(flags & 0x04),
        }

        # Energy Expended
        if flags & 0x08:
            energy = struct.unpack_from("<H", data, index)[0]
            result["energy_expended"] = energy
            index += 2

        # RR-Intervals (1/1024 秒)
        if flags & 0x10:
            rr_intervals: list[float] = []
            while index + 1 < len(data):
                rr_raw = struct.unpack_from("<H", data, index)[0]
                rr_intervals.append(rr_raw / 1024.0)
                index += 2
            result["rr_intervals"] = rr_intervals

        return result

    # ── 断线监控 ──────────────────────────────────────────────────────

    async def _watch_disconnect(self) -> None:
        """后台任务：监控连接状态。"""
        try:
            while self._running:
                await asyncio.sleep(1.0)
                if not self._client.is_connected:
                    logger.warning("检测到 BLE 断开")
                    self._running = False
                    if self._on_status:
                        self._on_status("disconnected")
                    break
        except asyncio.CancelledError:
            pass
