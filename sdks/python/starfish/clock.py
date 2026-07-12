from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING, Callable

from .id import next_id
from .types import StarfishFrame

if TYPE_CHECKING:
    from .connection import Connection

DEFAULT_SAMPLE_COUNT = 5


class Clock:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection
        self._offset: float = 0

    @property
    def offset(self) -> float:
        return self._offset

    def now(self) -> float:
        return time.time() * 1000 + self._offset

    async def sync(self, samples: int = DEFAULT_SAMPLE_COUNT) -> float:
        offsets: list[float] = []

        for _ in range(samples):
            t1 = time.time() * 1000
            frame = StarfishFrame(v=1, id=next_id("clock"), type="clock.sync", ts=int(t1))
            response = await self._connection.send_and_wait(frame)
            t4 = time.time() * 1000

            server_time = response.payload.get("serverTime") if response.payload else None
            if server_time:
                rtt = t4 - t1
                estimated_server_time = server_time + rtt / 2
                offsets.append(estimated_server_time - t4)

        if offsets:
            offsets.sort()
            self._offset = offsets[len(offsets) // 2]

        return self._offset

    def at(self, server_time: float, callback: Callable[[], None]) -> asyncio.TimerHandle:
        local_time = server_time - self._offset
        delay = max(0, local_time - time.time() * 1000) / 1000
        loop = asyncio.get_running_loop()
        return loop.call_later(delay, callback)
