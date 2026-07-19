from __future__ import annotations

import asyncio
import time
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .server import StarfishServer


class HeartbeatChecker:
    def __init__(self, hub: StarfishServer) -> None:
        self._hub = hub
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._loop())

    def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None

    async def _loop(self) -> None:
        interval = self._hub.config.heartbeat_interval_ms / 1000
        try:
            while True:
                await asyncio.sleep(interval)
                self._check()
        except asyncio.CancelledError:
            pass

    def _check(self) -> None:
        now = int(time.time() * 1000)
        timeout = self._hub.config.heartbeat_timeout_ms

        for client in list(self._hub.get_clients()):
            if not client.authenticated:
                continue
            if now - client.last_activity > timeout:
                client.close()
