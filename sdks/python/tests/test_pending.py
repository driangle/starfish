import asyncio

import pytest

from starfish.pending import PendingRequests, StarfishRequestError
from starfish.types import StarfishError, StarfishFrame


class TestPendingRequests:
    async def test_resolves_when_matching_reply_arrives(self):
        pending = PendingRequests()
        future = pending.add("msg_1", 5000)

        reply = StarfishFrame(
            v=1,
            id="srv_1",
            type="session.joined",
            reply_to="msg_1",
            payload={"clientId": "abc"},
        )

        assert pending.resolve(reply) is True
        result = await future
        assert result == reply

    async def test_rejects_on_error_frame(self):
        pending = PendingRequests()
        future = pending.add("msg_2", 5000)

        error_reply = StarfishFrame(
            v=1,
            id="err_1",
            type="error",
            reply_to="msg_2",
            error=StarfishError(
                code="session.not_found",
                message="Session does not exist.",
            ),
        )

        pending.resolve(error_reply)
        with pytest.raises(StarfishRequestError, match="Session does not exist."):
            await future

    async def test_times_out_if_no_reply(self):
        pending = PendingRequests()
        future = pending.add("msg_3", 50)  # 50ms timeout

        with pytest.raises(TimeoutError, match="timed out"):
            await asyncio.wait_for(future, timeout=1.0)

    async def test_returns_false_for_non_matching_frame(self):
        pending = PendingRequests()
        pending.add("msg_4", 5000)

        unrelated = StarfishFrame(v=1, id="evt_1", type="topic.message", reply_to="unknown_id")

        assert pending.resolve(unrelated) is False

    def test_returns_false_for_frame_without_reply_to(self):
        frame = StarfishFrame(v=1, id="evt_1", type="topic.message")
        pending = PendingRequests()
        assert pending.resolve(frame) is False

    async def test_rejects_all_pending_on_reject_all(self):
        pending = PendingRequests()
        f1 = pending.add("msg_5", 5000)
        f2 = pending.add("msg_6", 5000)

        pending.reject_all(Exception("disconnected"))

        with pytest.raises(Exception, match="disconnected"):
            await f1
        with pytest.raises(Exception, match="disconnected"):
            await f2
