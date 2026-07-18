from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.session import JoinOptions, Session
from starfish.types import StarfishClientOptions, StarfishFrame, StarfishHeader


def make_connection() -> Connection:
    opts = StarfishClientOptions(server="ws://localhost:8080")
    conn = Connection(opts)
    conn.client_id = "me-123"
    conn.send = AsyncMock()
    conn.send_and_wait = AsyncMock()
    return conn


class TestSession:
    @pytest.mark.asyncio
    async def test_join_sets_current_session(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="session",
                method="join",
                kind="response",
                session="room-1",
            ),
            payload={"status": "ok", "clients": []},
        )

        session = Session(conn)
        await session.join("room-1")

        assert session.current == "room-1"

    @pytest.mark.asyncio
    async def test_join_populates_clients(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="session",
                method="join",
                kind="response",
                session="room-1",
            ),
            payload={
                "status": "ok",
                "clients": [
                    {"id": "me-123", "name": "me", "role": "default", "meta": {}},
                    {"id": "peer-1", "name": "peer", "role": "viewer", "meta": {}},
                ],
            },
        )

        session = Session(conn)
        await session.join("room-1")

        assert len(session.clients.value) == 2
        assert len(session.peers.value) == 1
        assert session.peers.value[0].id == "peer-1"

    @pytest.mark.asyncio
    async def test_join_sends_correct_frame(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(id="resp_1", resource="session", method="join", kind="response"),
            payload={"status": "ok", "clients": []},
        )

        session = Session(conn)
        await session.join("room-1", JoinOptions(name="alice", role="admin"))

        sent_frame = conn.send_and_wait.call_args[0][0]
        assert sent_frame.header.resource == "session"
        assert sent_frame.header.method == "join"
        assert sent_frame.header.kind == "request"
        assert sent_frame.header.session == "room-1"
        assert sent_frame.payload["name"] == "alice"
        assert sent_frame.payload["role"] == "admin"

    @pytest.mark.asyncio
    async def test_leave_clears_session(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(id="resp_1", resource="session", method="join", kind="response"),
            payload={"status": "ok", "clients": []},
        )

        session = Session(conn)
        await session.join("room-1")
        await session.leave()

        assert session.current is None
        assert session.clients.value == []

    @pytest.mark.asyncio
    async def test_leave_noop_when_not_in_session(self):
        conn = make_connection()
        session = Session(conn)
        await session.leave()  # Should not raise
        conn.send.assert_not_called()

    @pytest.mark.asyncio
    async def test_handle_client_connected(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="session",
                method="join",
                kind="response",
                session="room-1",
            ),
            payload={"status": "ok", "clients": []},
        )

        session = Session(conn)
        await session.join("room-1")

        session.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="session",
                    method="connected",
                    kind="event",
                    session="room-1",
                ),
                payload={"client": {"id": "new-peer", "name": "bob", "role": "viewer", "meta": {}}},
            )
        )

        assert len(session.clients.value) == 1
        assert session.clients.value[0].id == "new-peer"

    @pytest.mark.asyncio
    async def test_handle_client_disconnected(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="session",
                method="join",
                kind="response",
                session="room-1",
            ),
            payload={
                "status": "ok",
                "clients": [{"id": "peer-1", "name": "bob", "role": "default", "meta": {}}],
            },
        )

        session = Session(conn)
        await session.join("room-1")
        assert len(session.clients.value) == 1

        session.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_2",
                    resource="session",
                    method="disconnected",
                    kind="event",
                    session="room-1",
                ),
                payload={"clientId": "peer-1"},
            )
        )

        assert len(session.clients.value) == 0

    @pytest.mark.asyncio
    async def test_ignores_frames_from_other_sessions(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="session",
                method="join",
                kind="response",
                session="room-1",
            ),
            payload={"status": "ok", "clients": []},
        )

        session = Session(conn)
        await session.join("room-1")

        session.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="session",
                    method="connected",
                    kind="event",
                    session="other-room",
                ),
                payload={"client": {"id": "x", "name": "x", "role": "x", "meta": {}}},
            )
        )

        assert len(session.clients.value) == 0
