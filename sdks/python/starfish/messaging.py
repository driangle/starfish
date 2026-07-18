from __future__ import annotations

from typing import Any

from .connection import Connection
from .id import next_id
from .session import Session
from .types import DeliveryOptions, HeaderOptions, StarfishFrame, StarfishHeader


class Messaging:
    def __init__(self, connection: Connection, session: Session) -> None:
        self._connection = connection
        self._session = session

    async def send(
        self, to: str | list[str], payload: Any, options: HeaderOptions | None = None
    ) -> None:
        session_name = self._require_session()
        header = StarfishHeader(
            id=next_id("send"),
            resource="message",
            method="send",
            kind="request",
            session=session_name,
            to=to,
        )
        if options:
            header.delivery = options.delivery
            header.priority = options.priority
            header.ttl = options.ttl
            header.meta = options.meta

        frame = StarfishFrame(header=header, payload=payload)

        await self._connection.send(frame)

    async def broadcast(
        self, payload: Any, *, include_self: bool = False, options: HeaderOptions | None = None
    ) -> None:
        session_name = self._require_session()

        header = StarfishHeader(
            id=next_id("bcast"),
            resource="session",
            method="broadcast",
            kind="request",
            session=session_name,
        )

        if options:
            header.delivery = options.delivery
            header.priority = options.priority
            header.ttl = options.ttl
            header.meta = options.meta

        if include_self:
            if header.delivery is None:
                header.delivery = DeliveryOptions(include_self=True)
            else:
                header.delivery.include_self = True

        frame = StarfishFrame(header=header, payload=payload)

        await self._connection.send(frame)

    def _require_session(self) -> str:
        session = self._session.current
        if not session:
            raise RuntimeError("Not in a session. Call join() first.")
        return session
