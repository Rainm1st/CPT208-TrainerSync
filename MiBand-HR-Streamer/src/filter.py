from __future__ import annotations

import statistics
from collections import deque
from typing import Callable, Optional


class MovingAverageFilter:
    """滑动窗口移动平均滤波。

    对实时心率数据流进行平滑，消除短时毛刺。
    窗口填满前返回原始值。
    """

    def __init__(self, window_size: int = 5) -> None:
        assert window_size >= 2, "window_size 必须 >= 2"
        self._window: deque[float] = deque(maxlen=window_size)
        self.window_size = window_size

    def update(self, value: float) -> float:
        """输入新值，返回滤波后的值。"""
        self._window.append(value)
        if len(self._window) < self.window_size:
            return value
        return sum(self._window) / len(self._window)

    @property
    def is_ready(self) -> bool:
        return len(self._window) >= self.window_size

    def reset(self) -> None:
        self._window.clear()


class MedianFilter:
    """滑动窗口中值滤波。

    对实时心率数据流进行排序取中值，对孤立离群点滤除效果优于
    移动平均。窗口填满前返回原始值。
    """

    def __init__(self, window_size: int = 5) -> None:
        assert window_size >= 3, "中值滤波 window_size 必须 >= 3"
        self._window: deque[float] = deque(maxlen=window_size)
        self.window_size = window_size

    def update(self, value: float) -> float:
        """输入新值，返回滤波后的值。"""
        self._window.append(value)
        if len(self._window) < self.window_size:
            return value
        return statistics.median(self._window)

    @property
    def is_ready(self) -> bool:
        return len(self._window) >= self.window_size

    def reset(self) -> None:
        self._window.clear()


class FilterChain:
    """滤波器链，串联多个滤波器。"""

    def __init__(self, filters: list[Callable[[float], float]]) -> None:
        self.filters = filters

    def update(self, value: float) -> float:
        result = value
        for f in self.filters:
            result = f(result)
        return result

    @classmethod
    def default(cls, window_size: int = 5) -> FilterChain:
        """创建默认滤波器链: 中值滤波 → 移动平均。"""
        median = MedianFilter(window_size)
        moving_avg = MovingAverageFilter(window_size)
        return cls(filters=[median.update, moving_avg.update])
