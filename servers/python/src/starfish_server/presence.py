from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .session import Session
    from .server import StarfishServer

PRESENCE_THROTTLE_MS = 50


class PresenceThrottle:
    """Batches presence updates and broadcasts at a fixed rate (50ms).
    Latest value per client wins — rapid updates coalesce.
    """

    def __init__(self, session: Session, hub: StarfishServer) -> None:
        self._session = session
        self._hub = hub
        self._pending: dict[str, Any] = {}
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        if self._task is None:
            try:
                asyncio.get_running_loop()
                self._task = asyncio.create_task(self._loop())
            except RuntimeError:
                # No running event loop (e.g. in tests) - flush must be called manually
                pass

    def set(self, client_id: str, payload: Any) -> None:
        self._pending[client_id] = payload

    def stop(self) -> None:
        if self._task is not None:
            self._task.cancel()
            self._task = None

    def flush(self) -> None:
        if not self._pending:
            return

        batch = self._pending
        self._pending = {}

        for client_id, payload in batch.items():
            self._session.broadcast(
                {
                    "header": {
                        "id": self._hub.id_gen.message_id(),
                        "resource": "presence",
                        "method": "updated",
                        "kind": "event",
                        "session": self._session.name,
                        "from": client_id,
                    },
                    "payload": payload,
                },
            )

    async def _loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(PRESENCE_THROTTLE_MS / 1000)
                self.flush()
        except asyncio.CancelledError:
            pass
