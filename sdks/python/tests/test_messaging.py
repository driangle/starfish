from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.messaging import Messaging
from starfish.session import Session
from starfish.types import StarfishClientOptions


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


class TestMessaging:
    @pytest.mark.asyncio
    async def test_send_to_single_client(self):
        conn = make_connection()
        session = make_session(conn)
        messaging = Messaging(conn, session)

        await messaging.send("peer-1", {"text": "hello"})

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.type == "client.send"
        assert sent_frame.to == "peer-1"
        assert sent_frame.payload == {"text": "hello"}
        assert sent_frame.session == "room-1"

    @pytest.mark.asyncio
    async def test_send_to_multiple_clients(self):
        conn = make_connection()
        session = make_session(conn)
        messaging = Messaging(conn, session)

        await messaging.send(["peer-1", "peer-2"], {"action": "sync"})

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.to == ["peer-1", "peer-2"]

    @pytest.mark.asyncio
    async def test_broadcast_sends_correct_frame(self):
        conn = make_connection()
        session = make_session(conn)
        messaging = Messaging(conn, session)

        await messaging.broadcast({"event": "update"})

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.type == "session.broadcast"
        assert sent_frame.payload == {"event": "update"}
        assert sent_frame.session == "room-1"

    @pytest.mark.asyncio
    async def test_broadcast_include_self(self):
        conn = make_connection()
        session = make_session(conn)
        messaging = Messaging(conn, session)

        await messaging.broadcast({"event": "ping"}, include_self=True)

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.options is not None
        assert sent_frame.options.delivery is not None
        assert sent_frame.options.delivery.include_self is True

    @pytest.mark.asyncio
    async def test_broadcast_without_include_self(self):
        conn = make_connection()
        session = make_session(conn)
        messaging = Messaging(conn, session)

        await messaging.broadcast({"event": "ping"})

        sent_frame = conn.send.call_args[0][0]
        assert sent_frame.options is None

    @pytest.mark.asyncio
    async def test_requires_session(self):
        conn = make_connection()
        session = Session(conn)  # No session joined
        messaging = Messaging(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await messaging.send("peer-1", {"x": 1})

    @pytest.mark.asyncio
    async def test_broadcast_requires_session(self):
        conn = make_connection()
        session = Session(conn)
        messaging = Messaging(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await messaging.broadcast({"x": 1})
