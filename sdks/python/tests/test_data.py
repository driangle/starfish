from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.data import ConflictError, Data, DataResult, SaveOptions
from starfish.session import Session
from starfish.types import StarfishClientOptions, StarfishFrame, StarfishHeader


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


class TestDataSave:
    @pytest.mark.asyncio
    async def test_save_replace(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="data",
                method="save",
                kind="response",
            ),
            payload={
                "status": "ok",
                "key": "score",
                "scope": "session",
                "data": {"points": 42},
                "version": 1,
            },
        )

        session = make_session(conn)
        data = Data(conn, session)

        result = await data.save(
            SaveOptions(key="score", scope="session", op="replace", data={"points": 42})
        )

        assert result.key == "score"
        assert result.scope == "session"
        assert result.data == {"points": 42}
        assert result.version == 1

        frame = conn.send_and_wait.call_args[0][0]
        assert frame.header.resource == "data"
        assert frame.header.method == "save"
        assert frame.payload["key"] == "score"
        assert frame.payload["op"] == "replace"

    @pytest.mark.asyncio
    async def test_save_with_expected_version(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="data",
                method="save",
                kind="response",
            ),
            payload={"status": "ok", "key": "k", "scope": "session", "data": {}, "version": 2},
        )

        session = make_session(conn)
        data = Data(conn, session)

        await data.save(
            SaveOptions(key="k", scope="session", op="merge", data={}, expected_version=1)
        )

        frame = conn.send_and_wait.call_args[0][0]
        assert frame.payload["expectedVersion"] == 1

    @pytest.mark.asyncio
    async def test_save_conflict_raises(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="data",
                method="save",
                kind="response",
            ),
            payload={
                "status": "error",
                "error": {
                    "code": "conflict",
                    "resource": "data",
                    "message": "Version conflict",
                    "retry": False,
                    "details": {"currentVersion": 3},
                },
            },
        )

        session = make_session(conn)
        data = Data(conn, session)

        with pytest.raises(ConflictError) as exc_info:
            await data.save(
                SaveOptions(key="k", scope="session", op="replace", data="x", expected_version=1)
            )

        assert exc_info.value.current_version == 3

    @pytest.mark.asyncio
    async def test_save_raises_when_not_in_session(self):
        conn = make_connection()
        session = Session(conn)
        data = Data(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await data.save(SaveOptions(key="k", scope="session", op="replace", data="x"))

    @pytest.mark.asyncio
    async def test_save_validates_data_size(self):
        conn = make_connection()
        session = make_session(conn)
        data = Data(conn, session)

        large_data = "x" * 300_000
        with pytest.raises(ValueError, match="exceeds size limit"):
            await data.save(SaveOptions(key="k", scope="session", op="replace", data=large_data))

    @pytest.mark.asyncio
    async def test_save_without_data(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="data",
                method="save",
                kind="response",
            ),
            payload={
                "status": "ok",
                "key": "k",
                "scope": "session",
                "data": None,
                "version": 0,
            },
        )

        session = make_session(conn)
        data = Data(conn, session)

        await data.save(SaveOptions(key="k", scope="session", op="delete"))

        frame = conn.send_and_wait.call_args[0][0]
        assert "data" not in frame.payload


class TestDataGet:
    @pytest.mark.asyncio
    async def test_get_returns_result(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            header=StarfishHeader(
                id="resp_1",
                resource="data",
                method="get",
                kind="response",
            ),
            payload={
                "status": "ok",
                "key": "config",
                "scope": "session",
                "data": {"theme": "dark"},
                "version": 5,
            },
        )

        session = make_session(conn)
        data = Data(conn, session)

        result = await data.get("config", "session")

        assert result.key == "config"
        assert result.data == {"theme": "dark"}
        assert result.version == 5

        frame = conn.send_and_wait.call_args[0][0]
        assert frame.header.resource == "data"
        assert frame.header.method == "get"
        assert frame.payload == {"key": "config", "scope": "session"}

    @pytest.mark.asyncio
    async def test_get_raises_when_not_in_session(self):
        conn = make_connection()
        session = Session(conn)
        data = Data(conn, session)

        with pytest.raises(RuntimeError, match="Not in a session"):
            await data.get("key")


class TestDataChanged:
    def test_handle_frame_emits_changed_event(self):
        conn = make_connection()
        session = make_session(conn)
        data = Data(conn, session)

        received: list[DataResult] = []
        data.changed.subscribe(lambda r: received.append(r))

        data.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="data",
                    method="changed",
                    kind="event",
                ),
                payload={"key": "score", "scope": "session", "data": {"points": 10}, "version": 2},
            )
        )

        assert len(received) == 1
        assert received[0].key == "score"
        assert received[0].data == {"points": 10}
        assert received[0].version == 2

    def test_handle_frame_emits_to_key_stream(self):
        conn = make_connection()
        session = make_session(conn)
        data = Data(conn, session)

        received: list[DataResult] = []
        data.key_stream("score").subscribe(lambda r: received.append(r))

        data.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="data",
                    method="changed",
                    kind="event",
                ),
                payload={"key": "score", "scope": "session", "data": 100, "version": 1},
            )
        )
        data.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_2",
                    resource="data",
                    method="changed",
                    kind="event",
                ),
                payload={"key": "other", "scope": "session", "data": "x", "version": 1},
            )
        )

        assert len(received) == 1
        assert received[0].key == "score"

    def test_handle_frame_ignores_non_data_frames(self):
        conn = make_connection()
        session = make_session(conn)
        data = Data(conn, session)

        received: list[DataResult] = []
        data.changed.subscribe(lambda r: received.append(r))

        data.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="presence",
                    method="updated",
                    kind="event",
                ),
                payload={"x": 1},
            )
        )

        assert len(received) == 0

    def test_handle_frame_ignores_frames_without_payload(self):
        conn = make_connection()
        session = make_session(conn)
        data = Data(conn, session)

        received: list[DataResult] = []
        data.changed.subscribe(lambda r: received.append(r))

        data.handle_frame(
            StarfishFrame(
                header=StarfishHeader(
                    id="evt_1",
                    resource="data",
                    method="changed",
                    kind="event",
                ),
            )
        )

        assert len(received) == 0
