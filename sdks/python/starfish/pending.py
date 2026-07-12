from __future__ import annotations

import asyncio
from typing import Any

from .types import StarfishFrame


class StarfishRequestError(Exception):
    def __init__(self, message: str, code: str | None = None, details: Any = None):
        super().__init__(message)
        self.code = code
        self.details = details


class PendingRequests:
    def __init__(self) -> None:
        self._pending: dict[str, tuple[asyncio.Future[StarfishFrame], asyncio.TimerHandle]] = {}

    def add(self, message_id: str, timeout_ms: int) -> asyncio.Future[StarfishFrame]:
        loop = asyncio.get_running_loop()
        future: asyncio.Future[StarfishFrame] = loop.create_future()

        def on_timeout() -> None:
            if message_id in self._pending:
                del self._pending[message_id]
                if not future.done():
                    future.set_exception(
                        TimeoutError(f"Request {message_id} timed out after {timeout_ms}ms")
                    )

        timer = loop.call_later(timeout_ms / 1000, on_timeout)
        self._pending[message_id] = (future, timer)
        return future

    def resolve(self, frame: StarfishFrame) -> bool:
        if not frame.reply_to:
            return False

        entry = self._pending.get(frame.reply_to)
        if entry is None:
            return False

        future, timer = entry
        del self._pending[frame.reply_to]
        timer.cancel()

        if frame.type == "error" and frame.error:
            future.set_exception(
                StarfishRequestError(frame.error.message, frame.error.code, frame.error.details)
            )
        else:
            future.set_result(frame)

        return True

    def reject_all(self, error: Exception) -> None:
        for _, (future, timer) in self._pending.items():
            timer.cancel()
            if not future.done():
                future.set_exception(error)
        self._pending.clear()
