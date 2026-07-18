from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING

from .id import next_id
from .types import StarfishFrame, StarfishHeader

if TYPE_CHECKING:
    from .connection import Connection


class Heartbeat:
    def __init__(self, connection: Connection) -> None:
        self._connection = connection
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self.stop()
        self._task = asyncio.create_task(self._run())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    async def _run(self) -> None:
        interval = self._connection.heartbeat_interval / 1000
        try:
            while True:
                await asyncio.sleep(interval)
                try:
                    ping = StarfishFrame(
                        header=StarfishHeader(
                            id=next_id("ping"),
                            resource="heartbeat",
                            method="ping",
                            kind="request",
                            ts=int(time.time() * 1000),
                        ),
                    )
                    await self._connection.send(ping)
                except Exception:
                    pass  # connection closed; heartbeat restarts on reconnect
        except asyncio.CancelledError:
            return
