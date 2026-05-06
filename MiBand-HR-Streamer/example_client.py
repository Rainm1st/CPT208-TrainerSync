#!/usr/bin/env python3
"""
MiBand-HR-Streamer — 用户端集成示例。

本文件展示如何在您自己的 Python 项目中使用 MiBandHRCollector。
"""

import asyncio

from src import MiBandHRCollector


# ══════════════════════════════════════════════════════════════════════
# 示例 1: 最简用法 — async for 流式读取
# ══════════════════════════════════════════════════════════════════════
async def example_basic():
    """基础异步迭代示例。"""
    collector = MiBandHRCollector(
        mac_address="AB:CD:EF:12:34:56",
        auth_key="0xa3c10e34e5c14637eea6b9efc06106",
    )

    async with collector:
        async for data in collector.stream(filtered=True):
            print(
                f"{data['datetime']} | HR: {data['heart_rate']} bpm "
                f"| contact: {data['contact_status']}"
            )


# ══════════════════════════════════════════════════════════════════════
# 示例 2: 获取原始 + 滤波数据的对比
# ══════════════════════════════════════════════════════════════════════
async def example_raw_vs_filtered():
    """原始数据 vs 滤波后数据对比。"""
    collector = MiBandHRCollector(
        mac_address="AB:CD:EF:12:34:56",
        auth_key="0xa3c10e34e5c14637eea6b9efc06106",
    )

    async with collector:
        # 启动两个并行的迭代器
        async def watch_raw():
            async for data in collector.stream(filtered=False):
                print(f"[RAW] {data['heart_rate']} bpm")

        async def watch_filtered():
            async for data in collector.stream(filtered=True):
                print(f"[FLT] {data['heart_rate']} bpm")

        await asyncio.gather(watch_raw(), watch_filtered())


# ══════════════════════════════════════════════════════════════════════
# 示例 3: 集成到您自己的算法管线
# ══════════════════════════════════════════════════════════════════════
class HRAnalyzer:
    """一个假设的心率分析器，展示如何将采集器嵌入已有管线。"""

    def __init__(self):
        self.hr_buffer: list[int] = []

    async def process(self, collector: MiBandHRCollector):
        async with collector:
            async for data in collector.stream(filtered=True):
                hr = data["heart_rate"]
                self.hr_buffer.append(hr)

                # 每 10 个数据计算一次均值
                if len(self.hr_buffer) >= 10:
                    avg = sum(self.hr_buffer[-10:]) / 10
                    print(f"[分析] 最近 10 拍均值: {avg:.1f} bpm")


async def example_with_analyzer():
    collector = MiBandHRCollector(
        mac_address="AB:CD:EF:12:34:56",
        auth_key="0xa3c10e34e5c14637eea6b9efc06106",
    )
    analyzer = HRAnalyzer()
    await analyzer.process(collector)


# ══════════════════════════════════════════════════════════════════════
# 示例 4: TCP 客户端 — 接收 main.py --websocket 广播的数据
# ══════════════════════════════════════════════════════════════════════
async def example_tcp_client(host="127.0.0.1", port=8765):
    """连接 main.py 的 TCP 广播端口接收心率数据。

    在另一个终端运行:
        python main.py --mac AB:CD:... --key 0xa3c1... --websocket

    然后运行本示例:
        python example_client.py
    """
    reader, writer = await asyncio.open_connection(host, port)
    print(f"已连接 TCP 服务器 {host}:{port}")

    try:
        while True:
            line = await reader.readline()
            if not line:
                break
            import json
            data = json.loads(line.decode("utf-8"))
            print(f"[TCP] HR: {data['heart_rate']} bpm @ {data['datetime']}")
    finally:
        writer.close()


# ══════════════════════════════════════════════════════════════════════
# 入口
# ══════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys

    print("MiBand-HR-Streamer 示例客户端")
    print("请在运行前修改示例中的 MAC 地址和 Auth Key")
    print()

    # 默认运行示例 1
    print("运行 example_basic (请先修改 mac_address 和 auth_key)")
    # asyncio.run(example_basic())
