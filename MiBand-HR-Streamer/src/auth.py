from __future__ import annotations

import asyncio
import logging
from typing import Optional

from bleak import BleakClient
from Crypto.Cipher import AES

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────
# 小米手环 BLE 认证协议
# ──────────────────────────────────────────────────────────────────────
#
# 收到 huami-token 提取的 16 字节 Auth Key 后，通过以下 2 次握手完成认证:
#
#   Step 1 — 请求认证
#     写入 0x0009:   \x01\x00                     (简单模式)
#                  或 \x01\x08 + \x00*16          (加密模式)
#
#   Step 2 — 验证响应
#     通知 0x000a:   \x10\x01\x01                  → 认证成功
#                  或 \x10\x01\x00 + 16 bytes     → 需要加密应答
#                  或 \x10\x01\x08 + 16 bytes     → 需要加密应答(加密模式)
#
#   Step 3 — 加密应答 (仅 Step 2 返回 challenge 时)
#     AES-128-ECB 加密 challenge → 写回 0x0009:
#       \x03\x00 + encrypted_16_bytes
#     或 \x03\x08 + encrypted_16_bytes
#
#   Step 4 — 确认
#     通知 0x000a: \x10\x01\x01                    → 认证完成
#


class MiBandAuth:
    """小米手环 BLE 连接与 Auth Key 握手认证。"""

    _SERVICE_UUID = "0000fee0-0000-1000-8000-00805f9b34fb"
    _WRITE_CHAR = "00000009-0000-1000-8000-00805f9b34fb"
    _NOTIFY_CHAR = "0000000a-0000-1000-8000-00805f9b34fb"

    # 认证请求命令
    _REQ_SIMPLE = b"\x01\x00"
    _REQ_ENCRYPTED = b"\x01\x08" + b"\x00" * 16
    _RESP_SIMPLE = b"\x03\x00"
    _RESP_ENCRYPTED = b"\x03\x08"

    # 响应解析
    _SUCCESS_FLAG = 0x01

    def __init__(self, mac_address: str, auth_key: str) -> None:
        """
        Args:
            mac_address: 手环 BLE MAC 地址。
            auth_key: huami-token 提取的 32 字符十六进制 Auth Key。
        """
        self.mac_address = mac_address
        self._auth_key_bytes = bytes.fromhex(auth_key)
        self.client: Optional[BleakClient] = None

        self._auth_event = asyncio.Event()
        self._auth_buffer = bytearray()
        self._authenticated = False

    # ── 公开方法 ──────────────────────────────────────────────────────

    async def connect_and_authenticate(self) -> BleakClient:
        """连接手环 → 完成认证握手 → 返回已认证的 BleakClient。"""
        self.client = BleakClient(self.mac_address, disconnected_callback=self._on_disconnect)

        logger.info("正在连接 %s ...", self.mac_address)
        await self.client.connect()
        logger.info("BLE 连接成功")

        if len(self._auth_key_bytes) != 16:
            raise ValueError(
                f"Auth Key 应为 16 字节，实际 {len(self._auth_key_bytes)} 字节"
            )

        await self._authenticate()
        self._authenticated = True
        logger.info("Auth Key 握手认证成功！")
        return self.client

    async def disconnect(self) -> None:
        """断开 BLE 连接。"""
        if self.client and self.client.is_connected:
            await self.client.disconnect()
            logger.info("BLE 断开连接")
        self._authenticated = False

    @property
    def is_connected(self) -> bool:
        return self.client is not None and self.client.is_connected

    # ── 认证握手 ──────────────────────────────────────────────────────

    async def _authenticate(self) -> None:
        """依次尝试简单模式和加密模式认证。"""
        if await self._handshake(self._REQ_SIMPLE, self._RESP_SIMPLE):
            return
        if await self._handshake(self._REQ_ENCRYPTED, self._RESP_ENCRYPTED):
            return
        raise RuntimeError("所有认证方式均失败，请检查 Auth Key 是否正确")

    async def _handshake(self, request: bytes, response_prefix: bytes) -> bool:
        """执行一次完整的认证握手。"""
        self._auth_event.clear()
        self._auth_buffer.clear()

        await self.client.start_notify(self._NOTIFY_CHAR, self._on_auth_notify)
        await self.client.write_gatt_char(self._WRITE_CHAR, request)

        try:
            await asyncio.wait_for(self._auth_event.wait(), timeout=5.0)
        except asyncio.TimeoutError:
            await self._stop_notify()
            return False

        await self._stop_notify()
        data = bytes(self._auth_buffer)

        # 情况 A — 直接成功
        if len(data) >= 3 and data[2] == self._SUCCESS_FLAG:
            return True

        # 情况 B — 收到 challenge，需加密应答
        # 响应格式: len(data) == 19 (0x10 + 0x01 + flag + 16 bytes)
        if len(data) >= 19:
            challenge = data[3:19]
            encrypted = self._encrypt_challenge(challenge)

            self._auth_event.clear()
            self._auth_buffer.clear()

            await self.client.start_notify(self._NOTIFY_CHAR, self._on_auth_notify)
            await self.client.write_gatt_char(
                self._WRITE_CHAR, response_prefix + encrypted
            )

            try:
                await asyncio.wait_for(self._auth_event.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                await self._stop_notify()
                return False

            await self._stop_notify()
            confirm = bytes(self._auth_buffer)
            return len(confirm) >= 3 and confirm[2] == self._SUCCESS_FLAG

        return False

    def _encrypt_challenge(self, challenge: bytes) -> bytes:
        """AES-128-ECB 加密 challenge。"""
        cipher = AES.new(self._auth_key_bytes, AES.MODE_ECB)
        return cipher.encrypt(challenge)

    # ── BLE 回调 ──────────────────────────────────────────────────────

    def _on_auth_notify(self, _sender: int, data: bytearray) -> None:
        """认证通知回调：缓冲数据并通知等待协程。"""
        self._auth_buffer.extend(data)
        self._auth_event.set()

    def _on_disconnect(self, client: BleakClient) -> None:
        """断开连接回调。"""
        self._authenticated = False
        logger.warning("BLE 连接已断开")

    # ── 辅助方法 ──────────────────────────────────────────────────────

    async def _stop_notify(self) -> None:
        try:
            await self.client.stop_notify(self._NOTIFY_CHAR)
        except Exception:
            pass
