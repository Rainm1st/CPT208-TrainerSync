from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MiBandConfig:
    """Mi Band 蓝牙心率拉取接口的全局配置。

    可通过构造函数参数或环境变量配置。环境变量优先级:
      - MIBAND_MAC
      - MIBAND_AUTH_KEY
      - MIBAND_AUTO_RECONNECT
    """

    # --- 设备参数 ---
    mac_address: str = ""
    """手环 BLE MAC 地址，格式如 'AB:CD:EF:12:34:56'"""

    auth_key: str = ""
    """huami-token 提取的 32 字符十六进制 Auth Key"""

    # --- BLE GATT UUID 常量 ---
    AUTH_SERVICE_UUID: str = "0000fee0-0000-1000-8000-00805f9b34fb"
    """小米手环认证服务 UUID"""

    AUTH_WRITE_CHAR: str = "00000009-0000-1000-8000-00805f9b34fb"
    """认证写入特征值 (写)"""

    AUTH_NOTIFY_CHAR: str = "0000000a-0000-1000-8000-00805f9b34fb"
    """认证通知特征值 (通知)"""

    HR_SERVICE_UUID: str = "0000180d-0000-1000-8000-00805f9b34fb"
    """标准心率服务 UUID"""

    HR_MEASUREMENT_CHAR: str = "00002a37-0000-1000-8000-00805f9b34fb"
    """心率测量特征值 (通知)"""

    HR_CONTROL_POINT: str = "00002a39-0000-1000-8000-00805f9b34fb"
    """心率控制点 (写)"""

    MI_SERVICE_UUID: str = "0000fee0-0000-1000-8000-00805f9b34fb"
    """小米私有服务 UUID (认证 & HR 控制)"""

    MI_HR_CONTROL_CHAR: str = "0000000e-0000-1000-8000-00805f9b34fb"
    """小米私有心率控制特征值 (写)"""

    # --- 滤波参数 ---
    filter_window_size: int = 5
    """滑动窗口大小，用于移动平均/中值滤波"""

    # --- 自动重连 ---
    auto_reconnect: bool = True
    max_reconnect_attempts: int = 5
    reconnect_base_delay: float = 1.0
    """重连基础延迟（秒），指数退避"""

    reconnect_max_delay: float = 30.0
    """重连最大延迟（秒）"""

    # --- WebSocket ---
    enable_websocket: bool = False
    websocket_host: str = "127.0.0.1"
    websocket_port: int = 8765

    # --- 日志 ---
    log_level: str = "INFO"

    # --- 扫描 ---
    scan_timeout: int = 10
    """BLE 扫描超时（秒）"""

    @classmethod
    def from_env(cls) -> MiBandConfig:
        """从环境变量加载配置。"""
        return cls(
            mac_address=os.getenv("MIBAND_MAC", ""),
            auth_key=os.getenv("MIBAND_AUTH_KEY", ""),
            auto_reconnect=os.getenv("MIBAND_AUTO_RECONNECT", "true").lower()
            == "true",
        )

    def validate(self) -> list[str]:
        """校验配置，返回缺失/错误项列表。"""
        errors: list[str] = []
        if not self.mac_address:
            errors.append("MAC 地址未设置 (mac_address)")
        if not self.auth_key:
            errors.append("Auth Key 未设置 (auth_key)")
        elif len(self.auth_key) != 32:
            errors.append(f"Auth Key 长度必须为 32 个十六进制字符，当前为 {len(self.auth_key)}")
        try:
            bytes.fromhex(self.auth_key)
        except ValueError:
            errors.append("Auth Key 不是有效的十六进制字符串")
        return errors
