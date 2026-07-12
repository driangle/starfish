from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Literal

from .connection import Connection
from .emitter import EventStream
from .id import next_id
from .limits import MAX_DATA_VALUE_SIZE, validate_payload_size
from .session import Session
from .types import StarfishFrame

DataOp = Literal[
    "replace",
    "merge",
    "set.add",
    "set.remove",
    "list.add",
    "list.remove",
    "counter.add",
    "delete",
]


@dataclass
class SaveOptions:
    key: str
    scope: Literal["self", "session"]
    op: DataOp
    data: Any = None
    expected_version: int | None = None


@dataclass
class DataResult:
    key: str
    scope: str
    data: Any
    version: int


class ConflictError(Exception):
    def __init__(self, message: str, current_version: int) -> None:
        super().__init__(message)
        self.current_version = current_version


class Data:
    def __init__(self, connection: Connection, session: Session) -> None:
        self._connection = connection
        self._session = session
        self._key_streams: dict[str, EventStream[DataResult]] = {}

        self.changed: EventStream[DataResult] = EventStream()

    def handle_frame(self, frame: StarfishFrame) -> None:
        if frame.type == "data.changed" and frame.payload:
            result = DataResult(
                key=frame.payload["key"],
                scope=frame.payload["scope"],
                data=frame.payload.get("data"),
                version=frame.payload["version"],
            )
            self.changed.emit(result)

            stream = self._key_streams.get(result.key)
            if stream:
                stream.emit(result)

    def key_stream(self, key: str) -> EventStream[DataResult]:
        stream = self._key_streams.get(key)
        if not stream:
            stream = EventStream()
            self._key_streams[key] = stream
        return stream

    async def save(self, options: SaveOptions) -> DataResult:
        session_name = self._require_session()

        if options.data is not None:
            validate_payload_size(json.dumps(options.data), MAX_DATA_VALUE_SIZE, "Data value")

        payload: dict[str, Any] = {
            "key": options.key,
            "scope": options.scope,
            "op": options.op,
        }
        if options.data is not None:
            payload["data"] = options.data
        if options.expected_version is not None:
            payload["expectedVersion"] = options.expected_version

        frame = StarfishFrame(
            v=1,
            id=next_id("dsave"),
            type="data.save",
            session=session_name,
            payload=payload,
        )

        response = await self._connection.send_and_wait(frame)

        if response.error:
            if response.error.code == "conflict":
                current_version = (response.error.details or {}).get("currentVersion", 0)
                raise ConflictError(response.error.message, current_version)
            raise RuntimeError(f"Data save error: {response.error.message}")

        return DataResult(
            key=response.payload["key"],
            scope=response.payload["scope"],
            data=response.payload.get("data"),
            version=response.payload["version"],
        )

    async def get(self, key: str, scope: Literal["self", "session"] = "session") -> DataResult:
        session_name = self._require_session()

        frame = StarfishFrame(
            v=1,
            id=next_id("dget"),
            type="data.get",
            session=session_name,
            payload={"key": key, "scope": scope},
        )

        response = await self._connection.send_and_wait(frame)

        if response.error:
            raise RuntimeError(f"Data get error: {response.error.message}")

        return DataResult(
            key=response.payload["key"],
            scope=response.payload["scope"],
            data=response.payload.get("data"),
            version=response.payload["version"],
        )

    def _require_session(self) -> str:
        session = self._session.current
        if not session:
            raise RuntimeError("Not in a session. Call join() first.")
        return session
