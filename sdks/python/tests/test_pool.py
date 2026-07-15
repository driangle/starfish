from __future__ import annotations

from unittest.mock import AsyncMock

import pytest

from starfish.connection import Connection
from starfish.pool import Pool, PoolEnterOptions, PoolMatchResult
from starfish.types import StarfishClientOptions, StarfishError, StarfishFrame


def make_connection() -> Connection:
    opts = StarfishClientOptions(server="ws://localhost:8080")
    conn = Connection(opts)
    conn.client_id = "me-123"
    conn.send = AsyncMock()
    conn.send_and_wait = AsyncMock()
    return conn


class TestPoolEnter:
    @pytest.mark.asyncio
    async def test_enter_auto_mode_minimal(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            payload={"pool": "lobby", "mode": "auto", "groupSize": 2},
        )

        pool = Pool(conn)
        result = await pool.enter(PoolEnterOptions(pool="lobby"))

        assert result.pool == "lobby"
        assert result.mode == "auto"
        assert result.group_size == 2
        assert result.members == []

        sent = conn.send_and_wait.call_args[0][0]
        assert sent.type == "pool.enter"
        assert sent.payload["pool"] == "lobby"
        assert sent.payload["create"] is True
        assert sent.payload["groupSize"] == 2
        # auto mode should not include "mode" in payload
        assert "mode" not in sent.payload

    @pytest.mark.asyncio
    async def test_enter_claim_mode_with_members(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            payload={
                "pool": "lobby",
                "mode": "claim",
                "groupSize": 2,
                "members": [
                    {"id": "client_a", "attributes": {"mood": "calm"}},
                    {"id": "client_b", "attributes": {"mood": "wild"}},
                ],
            },
        )

        pool = Pool(conn)
        result = await pool.enter(PoolEnterOptions(pool="lobby", mode="claim"))

        assert result.mode == "claim"
        assert len(result.members) == 2
        assert result.members[0].id == "client_a"
        assert result.members[0].attributes == {"mood": "calm"}
        assert result.members[1].id == "client_b"

        # members observable should also be populated
        obs = pool.members("lobby")
        assert len(obs.value) == 2

    @pytest.mark.asyncio
    async def test_enter_raises_on_not_found(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            error=StarfishError(code="pool.not_found", message="Pool does not exist"),
        )

        pool = Pool(conn)
        with pytest.raises(RuntimeError, match="Pool not found"):
            await pool.enter(PoolEnterOptions(pool="missing", create=False))

    @pytest.mark.asyncio
    async def test_enter_forwards_filter(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            payload={"pool": "lobby", "mode": "auto", "groupSize": 2},
        )

        pool = Pool(conn)
        await pool.enter(
            PoolEnterOptions(
                pool="lobby",
                attributes={"language": "en"},
                filter={"language": "@self"},
            )
        )

        sent = conn.send_and_wait.call_args[0][0]
        assert sent.payload["filter"] == {"language": "@self"}
        assert sent.payload["attributes"] == {"language": "en"}


class TestPoolLeave:
    @pytest.mark.asyncio
    async def test_leave_sends_correct_frame(self):
        conn = make_connection()
        pool = Pool(conn)

        await pool.leave("lobby")

        sent = conn.send.call_args[0][0]
        assert sent.type == "pool.leave"
        assert sent.payload == {"pool": "lobby"}


class TestPoolClaim:
    @pytest.mark.asyncio
    async def test_claim_sends_correct_frame(self):
        conn = make_connection()
        pool = Pool(conn)

        await pool.claim("lobby", "client_b")

        sent = conn.send.call_args[0][0]
        assert sent.type == "pool.claim"
        assert sent.payload == {"pool": "lobby", "target": "client_b"}

    @pytest.mark.asyncio
    async def test_accept_sends_correct_frame(self):
        conn = make_connection()
        pool = Pool(conn)

        await pool.accept("lobby", "client_a")

        sent = conn.send.call_args[0][0]
        assert sent.type == "pool.accept"
        assert sent.payload == {"pool": "lobby", "from": "client_a"}

    @pytest.mark.asyncio
    async def test_reject_sends_correct_frame(self):
        conn = make_connection()
        pool = Pool(conn)

        await pool.reject("lobby", "client_a")

        sent = conn.send.call_args[0][0]
        assert sent.type == "pool.reject"
        assert sent.payload == {"pool": "lobby", "from": "client_a"}


class TestPoolAssign:
    @pytest.mark.asyncio
    async def test_assign_sends_and_returns_response(self):
        conn = make_connection()
        response = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.assigned",
            payload={
                "pool": "lobby",
                "matched": [
                    {"group": ["client_a", "client_b"], "session": "s-123"},
                ],
            },
        )
        conn.send_and_wait.return_value = response

        pool = Pool(conn)
        result = await pool.assign("lobby", [["client_a", "client_b"]])

        sent = conn.send_and_wait.call_args[0][0]
        assert sent.type == "pool.assign"
        assert sent.payload == {
            "pool": "lobby",
            "groups": [["client_a", "client_b"]],
        }
        assert result is response


class TestPoolMatched:
    @pytest.mark.asyncio
    async def test_matched_event_fires(self):
        conn = make_connection()
        pool = Pool(conn)

        results: list[PoolMatchResult] = []
        pool.matched.subscribe(results.append)

        pool.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="pool.matched",
                payload={
                    "pool": "lobby",
                    "session": "s-abc",
                    "peers": [
                        {"id": "client_a", "attributes": {"mood": "calm"}},
                        {"id": "client_b", "attributes": {}},
                    ],
                },
            )
        )

        assert len(results) == 1
        assert results[0].pool == "lobby"
        assert results[0].session == "s-abc"
        assert len(results[0].peers) == 2
        assert results[0].peers[0].id == "client_a"
        assert results[0].peers[0].attributes == {"mood": "calm"}


class TestPoolMembers:
    @pytest.mark.asyncio
    async def test_members_updates_on_joined(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            payload={
                "pool": "lobby",
                "mode": "claim",
                "groupSize": 2,
                "members": [{"id": "client_a", "attributes": {}}],
            },
        )

        pool = Pool(conn)
        await pool.enter(PoolEnterOptions(pool="lobby", mode="claim"))

        obs = pool.members("lobby")
        assert len(obs.value) == 1

        pool.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="pool.member.joined",
                payload={
                    "pool": "lobby",
                    "member": {"id": "client_b", "attributes": {"mood": "wild"}},
                },
            )
        )

        assert len(obs.value) == 2
        assert obs.value[1].id == "client_b"
        assert obs.value[1].attributes == {"mood": "wild"}

    @pytest.mark.asyncio
    async def test_members_updates_on_left(self):
        conn = make_connection()
        conn.send_and_wait.return_value = StarfishFrame(
            v=1,
            id="resp_1",
            type="pool.entered",
            payload={
                "pool": "lobby",
                "mode": "claim",
                "groupSize": 2,
                "members": [
                    {"id": "client_a", "attributes": {}},
                    {"id": "client_b", "attributes": {}},
                ],
            },
        )

        pool = Pool(conn)
        await pool.enter(PoolEnterOptions(pool="lobby", mode="claim"))

        obs = pool.members("lobby")
        assert len(obs.value) == 2

        pool.handle_frame(
            StarfishFrame(
                v=1,
                id="evt_1",
                type="pool.member.left",
                payload={
                    "pool": "lobby",
                    "memberId": "client_a",
                    "reason": "left",
                },
            )
        )

        assert len(obs.value) == 1
        assert obs.value[0].id == "client_b"
