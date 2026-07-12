from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.session import Session
from starfish.topics import Topics
from starfish.types import StarfishClientOptions, StarfishFrame


def make_connection() -> Connection:
    opts = StarfishClientOptions(server="ws://localhost:8080")
    conn = Connection(opts)
    conn.client_id = "me-123"
    conn.send = AsyncMock()
    conn.send_and_wait = AsyncMock()
    return conn


def make_session(conn: Connection, session_name: str = "room-1") -> Session:
    session = Session(conn)
    session._session = session_name
    return session


class TestTopics:
    @pytest.mark.asyncio
    async def test_subscribe_sends_correct_frame(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1, id="resp_1", type="topic.subscribed", topic="chat"
        )
        session = make_session(conn)
        topics = Topics(conn, session)

        await topics.subscribe("chat")

        sent_frame = conn.send_and_wait.call_args[0][0]
        assert sent_frame.type == "topic.subscribe"
        assert sent_frame.topic == "chat"
        assert sent_frame.session == "room-1"

    @pytest.mark.asyncio
    async def test_subscribe_registers_callback(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1, id="resp_1", type="topic.subscribed", topic="chat"
        )
        session = make_session(conn)
        topics = Topics(conn, session)

        received = []
        await topics.subscribe("chat", lambda f: received.append(f))

        msg = StarfishFrame(
            v=1, id="msg_1", type="topic.message", topic="chat", payload={"text": "hello"}
        )
        topics.handle_frame(msg)

        assert len(received) == 1
        assert received[0].payload == {"text": "hello"}

    @pytest.mark.asyncio
    async def test_unsubscribe_sends_frame(self):
        conn = make_connection()
        session = make_session(conn)
        topics = Topics(conn, session)

        await topics.unsubscribe("chat")

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.type == "topic.unsubscribe"
        assert sent_frame.topic == "chat"

    @pytest.mark.asyncio
    async def test_publish_sends_frame(self):
        conn = make_connection()
        session = make_session(conn)
        topics = Topics(conn, session)

        await topics.publish("chat", {"text": "hi"})

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.type == "topic.publish"
        assert sent_frame.topic == "chat"
        assert sent_frame.payload == {"text": "hi"}

    @pytest.mark.asyncio
    async def test_requires_session(self):
        conn = make_connection()
        session = Session(conn)  # No session joined
        topics = Topics(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await topics.subscribe("chat")

    @pytest.mark.asyncio
    async def test_validates_topic_name(self):
        conn = make_connection()
        session = make_session(conn)
        topics = Topics(conn, session)

        long_name = "x" * 200
        with pytest.raises(ValueError, match="exceeds"):
            await topics.subscribe(long_name)

    def test_handle_frame_dispatches_to_stream(self):
        conn = make_connection()
        session = make_session(conn)
        topics = Topics(conn, session)

        received = []
        topics.topic_stream("updates").subscribe(lambda f: received.append(f))

        topics.handle_frame(
            StarfishFrame(v=1, id="m1", type="topic.message", topic="updates", payload={"v": 1})
        )

        assert len(received) == 1

    def test_handle_frame_ignores_non_topic_messages(self):
        conn = make_connection()
        session = make_session(conn)
        topics = Topics(conn, session)

        received = []
        topics.topic_stream("chat").subscribe(lambda f: received.append(f))

        topics.handle_frame(StarfishFrame(v=1, id="m1", type="client.connected", payload={}))

        assert len(received) == 0
