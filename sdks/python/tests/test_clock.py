import asyncio
import time
from unittest.mock import AsyncMock, MagicMock

from starfish.clock import Clock
from starfish.types import StarfishFrame, StarfishHeader


def mock_connection():
    conn = MagicMock()
    conn.send_and_wait = AsyncMock()
    return conn


class TestClock:
    def test_starts_with_zero_offset(self):
        conn = mock_connection()
        clock = Clock(conn)
        assert clock.offset == 0

    def test_now_returns_current_time_plus_offset(self):
        conn = mock_connection()
        clock = Clock(conn)
        before = time.time() * 1000
        result = clock.now()
        after = time.time() * 1000
        assert before <= result <= after

    async def test_sync_estimates_offset_from_multiple_samples(self):
        conn = mock_connection()
        clock = Clock(conn)

        call_count = 0

        async def mock_send_and_wait(frame):
            nonlocal call_count
            call_count += 1
            # Simulate server time being 100ms ahead with ~0ms RTT
            client_time = time.time() * 1000
            return StarfishFrame(
                header=StarfishHeader(
                    id=f"clock_{call_count}",
                    resource="clock",
                    method="sync",
                    kind="response",
                    reply_to=f"clock_{call_count}",
                ),
                payload={"serverTime": client_time + 100},
            )

        conn.send_and_wait = mock_send_and_wait

        offset = await clock.sync(3)

        assert abs(offset - 100) < 10  # ~100ms offset, allowing for test execution time
        assert clock.offset == offset

    async def test_at_schedules_callback_at_server_time(self):
        conn = mock_connection()
        clock = Clock(conn)
        clock._offset = 100  # server is 100ms ahead

        callback_called = asyncio.Event()

        def callback():
            callback_called.set()

        server_time = time.time() * 1000 + 100 + 50  # 50ms from now in server time
        clock.at(server_time, callback)

        # Should fire within ~100ms
        await asyncio.wait_for(callback_called.wait(), timeout=1.0)
        assert callback_called.is_set()
