from __future__ import annotations

import json
from typing import Any

from .connection import Connection
from .emitter import Observable
from .id import next_id
from .limits import MAX_PRESENCE_SIZE, validate_payload_size
from .session import Session
from .types import StarfishFrame, StarfishHeader


class Presence:
    def __init__(self, connection: Connection, session: Session) -> None:
        self._connection = connection
        self._session = session
        self._presence_map: dict[str, Any] = {}

        self.presence: Observable[dict[str, Any]] = Observable({})

    def set(self, payload: Any) -> None:
        session_name = self._require_session()
        validate_payload_size(json.dumps(payload), MAX_PRESENCE_SIZE, "Presence payload")

        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pres"),
                resource="presence",
                method="set",
                kind="request",
                session=session_name,
            ),
            payload=payload,
        )

        import asyncio

        asyncio.ensure_future(self._connection.send(frame))

    async def set_async(self, payload: Any) -> None:
        session_name = self._require_session()
        validate_payload_size(json.dumps(payload), MAX_PRESENCE_SIZE, "Presence payload")

        frame = StarfishFrame(
            header=StarfishHeader(
                id=next_id("pres"),
                resource="presence",
                method="set",
                kind="request",
                session=session_name,
            ),
            payload=payload,
        )

        await self._connection.send(frame)

    def handle_frame(self, frame: StarfishFrame) -> None:
        if (
            frame.header.resource == "presence"
            and frame.header.method == "updated"
            and frame.header.from_
        ):
            self._presence_map[frame.header.from_] = frame.payload
            self.presence.set(dict(self._presence_map))

    def clear(self) -> None:
        self._presence_map.clear()
        self.presence.set({})

    def _require_session(self) -> str:
        session = self._session.current
        if not session:
            raise RuntimeError("Not in a session. Call join() first.")
        return session
