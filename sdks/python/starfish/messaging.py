from __future__ import annotations

from typing import Any

from .connection import Connection
from .id import next_id
from .session import Session
from .types import DeliveryOptions, FrameOptions, StarfishFrame


class Messaging:
    def __init__(self, connection: Connection, session: Session) -> None:
        self._connection = connection
        self._session = session

    async def send(
        self, to: str | list[str], payload: Any, options: FrameOptions | None = None
    ) -> None:
        session_name = self._require_session()
        frame = StarfishFrame(
            v=1,
            id=next_id("send"),
            type="client.send",
            session=session_name,
            to=to,
            payload=payload,
            options=options,
        )

        await self._connection.send(frame)

    async def broadcast(
        self, payload: Any, *, include_self: bool = False, options: FrameOptions | None = None
    ) -> None:
        session_name = self._require_session()

        if include_self:
            if options is None:
                options = FrameOptions(delivery=DeliveryOptions(include_self=True))
            elif options.delivery is None:
                options.delivery = DeliveryOptions(include_self=True)
            else:
                options.delivery.include_self = True

        frame = StarfishFrame(
            v=1,
            id=next_id("bcast"),
            type="session.broadcast",
            session=session_name,
            payload=payload,
            options=options,
        )

        await self._connection.send(frame)

    def _require_session(self) -> str:
        session = self._session.current
        if not session:
            raise RuntimeError("Not in a session. Call join() first.")
        return session
