from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.presence import Presence
from starfish.session import Session
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


class TestPresence:
    @pytest.mark.asyncio
    async def test_set_async_sends_frame(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        await presence.set_async({"cursor": {"x": 10, "y": 20}})

        conn.send.assert_called_once()
        frame = conn.send.call_args[0][0]
        assert frame.type == "presence.set"
        assert frame.session == "room-1"
        assert frame.payload == {"cursor": {"x": 10, "y": 20}}

    @pytest.mark.asyncio
    async def test_set_async_raises_when_not_in_session(self):
        conn = make_connection()
        session = Session(conn)
        presence = Presence(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await presence.set_async({"status": "online"})

    @pytest.mark.asyncio
    async def test_set_async_validates_payload_size(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        # 8KB limit for presence
        large_payload = {"data": "x" * 9000}
        with pytest.raises(ValueError, match="exceeds size limit"):
            await presence.set_async(large_payload)

    def test_handle_frame_updates_presence_map(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="presence.updated",
                from_="peer-1",
                payload={"cursor": {"x": 5, "y": 10}},
            )
        )

        assert presence.presence.value == {"peer-1": {"cursor": {"x": 5, "y": 10}}}

    def test_handle_frame_updates_multiple_clients(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="presence.updated",
                from_="peer-1",
                payload={"status": "active"},
            )
        )
        presence.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_2",
                type="presence.updated",
                from_="peer-2",
                payload={"status": "idle"},
            )
        )

        assert presence.presence.value == {
            "peer-1": {"status": "active"},
            "peer-2": {"status": "idle"},
        }

    def test_handle_frame_overwrites_same_client(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(
                v=1, id="evt_1", type="presence.updated", from_="peer-1", payload={"v": 1}
            )
        )
        presence.handle_frame(
            StarfishFrame(
                v=1, id="evt_2", type="presence.updated", from_="peer-1", payload={"v": 2}
            )
        )

        assert presence.presence.value == {"peer-1": {"v": 2}}

    def test_handle_frame_ignores_non_presence_frames(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="message.received",
                from_="peer-1",
                payload={"hi": 1},
            )
        )

        assert presence.presence.value == {}

    def test_handle_frame_ignores_frames_without_from(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(v=1, id="evt_1", type="presence.updated", payload={"hi": 1})
        )

        assert presence.presence.value == {}

    def test_clear_resets_presence(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        presence.handle_frame(
            StarfishFrame(
                v=1, id="evt_1", type="presence.updated", from_="peer-1", payload={"v": 1}
            )
        )
        presence.clear()

        assert presence.presence.value == {}

    def test_presence_observable_notifies_subscribers(self):
        conn = make_connection()
        session = make_session(conn)
        presence = Presence(conn, session)

        received: list = []
        presence.presence.subscribe(lambda v: received.append(v))

        presence.handle_frame(
            StarfishFrame(
                v=1, id="evt_1", type="presence.updated", from_="peer-1", payload={"x": 1}
            )
        )

        assert len(received) == 1
        assert received[0] == {"peer-1": {"x": 1}}
