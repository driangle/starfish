from __future__ import annotations

from typing import Any, Callable

from .connection import Connection
from .emitter import EventStream
from .id import next_id
from .limits import validate_topic_name
from .session import Session
from .types import FrameOptions, StarfishFrame


class Topics:
    def __init__(self, connection: Connection, session: Session) -> None:
        self._connection = connection
        self._session = session
        self._topic_streams: dict[str, EventStream[StarfishFrame]] = {}
        self._subscriptions: set[str] = set()

    async def subscribe(
        self, topic: str, callback: Callable[[StarfishFrame], None] | None = None
    ) -> StarfishFrame:
        validate_topic_name(topic)

        session_name = self._require_session()
        frame = StarfishFrame(
            v=1,
            id=next_id("sub"),
            type="topic.subscribe",
            session=session_name,
            topic=topic,
        )

        response = await self._connection.send_and_wait(frame)
        self._subscriptions.add(topic)

        if callback:
            self.topic_stream(topic).subscribe(callback)

        return response

    async def unsubscribe(self, topic: str) -> None:
        session_name = self._require_session()
        frame = StarfishFrame(
            v=1,
            id=next_id("unsub"),
            type="topic.unsubscribe",
            session=session_name,
            topic=topic,
        )

        await self._connection.send(frame)
        self._subscriptions.discard(topic)

    async def publish(self, topic: str, payload: Any, options: FrameOptions | None = None) -> None:
        validate_topic_name(topic)

        session_name = self._require_session()
        frame = StarfishFrame(
            v=1,
            id=next_id("pub"),
            type="topic.publish",
            session=session_name,
            topic=topic,
            payload=payload,
            options=options,
        )

        await self._connection.send(frame)

    def topic_stream(self, topic: str) -> EventStream[StarfishFrame]:
        stream = self._topic_streams.get(topic)
        if not stream:
            stream = EventStream()
            self._topic_streams[topic] = stream
        return stream

    def handle_frame(self, frame: StarfishFrame) -> None:
        if frame.type == "topic.message" and frame.topic:
            stream = self._topic_streams.get(frame.topic)
            if stream:
                stream.emit(frame)

    def _require_session(self) -> str:
        session = self._session.current
        if not session:
            raise RuntimeError("Not in a session. Call join() first.")
        return session
