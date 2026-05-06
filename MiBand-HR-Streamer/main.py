#!/usr/bin/env python3
"""
MiBand-HR-Streamer — 小米手环实时心率拉取 CLI。

用法:
    python main.py --mac AB:CD:EF:12:34:56 --key 0xa3c10e34e5c14637eea6b9efc06106

    # 开启 TCP 数据广播
    python main.py --mac AB:CD:EF:12:34:56 --key 0xa3c1... --websocket --ws-port 9876

    # 仅使用环境变量
    set MIBAND_MAC=AB:CD:EF:12:34:56
    set MIBAND_AUTH_KEY=0xa3c1...
    python main.py
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import signal
import sys

from src import MiBandHRCollector
from src.config import MiBandConfig


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="小米手环实时心率拉取接口 (MiBand-HR-Streamer)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # 设备参数
    dev = parser.add_argument_group("设备参数")
    dev.add_argument("--mac", help="手环 BLE MAC 地址 (如 AB:CD:EF:12:34:56)")
    dev.add_argument("--key", help="huami-token 提取的 32 字符十六进制 Auth Key")

    # 滤波
    flt = parser.add_argument_group("滤波设置")
    flt.add_argument(
        "--filter-window",
        type=int,
        default=5,
        help="滤波滑动窗口大小 (默认: 5, 1 或 0 则关闭滤波)",
    )

    # 重连
    rec = parser.add_argument_group("重连设置")
    rec.add_argument("--no-auto-reconnect", action="store_true", help="关闭自动重连")
    rec.add_argument("--max-reconnect", type=int, default=5, help="最大重连次数 (默认: 5)")

    # TCP 广播
    tcp = parser.add_argument_group("TCP 数据广播")
    tcp.add_argument("--websocket", action="store_true", help="启用 TCP 服务器广播心率数据")
    tcp.add_argument("--ws-host", default="127.0.0.1", help="TCP 服务器监听地址 (默认: 127.0.0.1)")
    tcp.add_argument("--ws-port", type=int, default=8765, help="TCP 服务器监听端口 (默认: 8765)")

    # 日志
    log = parser.add_argument_group("日志")
    log.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])

    return parser


def _apply_args(config: MiBandConfig, args: argparse.Namespace) -> MiBandConfig:
    """将命令行参数合并到配置对象。"""
    if args.mac:
        config.mac_address = args.mac
    if args.key:
        config.auth_key = args.key
    config.filter_window_size = args.filter_window
    config.auto_reconnect = not args.no_auto_reconnect
    config.max_reconnect_attempts = args.max_reconnect
    config.enable_websocket = args.websocket
    config.websocket_host = args.ws_host
    config.websocket_port = args.ws_port
    config.log_level = args.log_level
    return config


async def _main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    # 加载配置
    config = _apply_args(MiBandConfig.from_env(), args)

    # 校验
    errors = config.validate()
    if errors:
        parser.error("配置缺失或无效:\n  - " + "\n  - ".join(errors))

    # 日志
    logging.basicConfig(
        level=getattr(logging, config.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 屏蔽过长的 bleak 调试日志
    logging.getLogger("bleak").setLevel(logging.WARNING)

    logger = logging.getLogger("main")

    # 优雅退出
    shutdown_event = asyncio.Event()

    def _signal_handler() -> None:
        logger.info("收到退出信号，正在关闭...")
        shutdown_event.set()

    if sys.platform != "win32":
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, _signal_handler)

    # 启动采集器
    collector = MiBandHRCollector(
        mac_address=config.mac_address,
        auth_key=config.auth_key,
        config=config,
    )

    try:
        async with collector:
            logger.info("MiBand-HR-Streamer 已启动，等待心率数据...")
            print("-" * 60)
            print("  时间戳                  | 心率 | 接触 | 滤波后")
            print("-" * 60)

            async for data in collector.stream(filtered=True):
                # 终端输出
                ts = data.get("datetime", "?")[11:23]  # HH:MM:SS.ffffff
                hr_raw = data.get("heart_rate_raw", "")
                hr_filt = data["heart_rate"]
                contact = "✓" if data.get("contact_status") else "✗"

                hr_str = f"{hr_filt:3d} bpm"
                if hr_raw:
                    hr_str = f"{hr_filt:3d} bpm (raw {hr_raw})"

                print(
                    f"  {ts}  | {hr_str:16s} |  {contact}  "
                )

                # 检测退出信号
                if shutdown_event.is_set():
                    break
    except KeyboardInterrupt:
        logger.info("用户中断")
    except Exception as e:
        logger.exception("运行出错: %s", e)
    finally:
        logger.info("程序退出")


if __name__ == "__main__":
    asyncio.run(_main())
