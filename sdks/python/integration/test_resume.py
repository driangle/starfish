"""Integration tests: resume / reconnection."""

from __future__ import annotations

import asyncio

import pytest

from starfish import ConnectionState, StarfishClient, StarfishFrame

from .conftest import create_client, unique_session

# Known Python SDK bug (task 01ky0jyep): Connection.disconnect() cancels the
# receive task before closing the WebSocket, so the close handshake never
# completes promptly and the server detects the drop too late to restore the
# session. Reconnecting therefore yields a fresh clientId. The equivalent
# TypeScript SDK flow resumes correctly. Marked xfail(strict) so the suite stays
# green until the SDK is fixed, at which point these will flip to xpass and flag
# that the markers can be removed.
RESUME_DISCONNECT_BUG = pytest.mark.xfail(
    reason="Python SDK disconnect() breaks resume; see task 01ky0jyep",
    strict=True,
)


@pytest.mark.asyncio
class TestResume:
    @RESUME_DISCONNECT_BUG
    async def test_resume_preserves_client_id(self, clients: list[StarfishClient]):
        client = create_client("resumer")
        clients.append(client)
        await client.connect()
        original_id = client.client_id
        assert original_id is not None

        await client.disconnect()
        await client.connect()

        # Resuming with the stored token restores the same clientId; a fresh
        # connection would have been assigned a brand-new one.
        assert client.client_id == original_id
        assert client.connection_state.value == ConnectionState.CONNECTED

    @RESUME_DISCONNECT_BUG
    async def test_session_membership_restored_after_resume(self, clients: list[StarfishClient]):
        session = unique_session()

        client1 = create_client("member1")
        clients.append(client1)
        await client1.connect()
        await client1.join(session)
        original_id = client1.client_id

        client2 = create_client("member2")
        clients.append(client2)
        await client2.connect()
        await client2.join(session)

        # client1 drops and resumes with its token.
        await client1.disconnect()
        await client1.connect()
        assert client1.client_id == original_id

        # Membership is restored server-side: a broadcast from client2 still
        # reaches the resumed client1.
        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        client1.on(
            lambda f: (
                received.set_result(f)
                if f.header.resource == "session"
                and f.header.method == "broadcast"
                and not received.done()
                else None
            )
        )

        await client2.broadcast({"ping": "after-resume"})

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.header.from_ == client2.client_id
        assert message.payload == {"ping": "after-resume"}

    async def test_invalid_resume_token_gives_fresh_session(self, clients: list[StarfishClient]):
        client = create_client("bad-resume")
        clients.append(client)
        await client.connect()
        original_id = client.client_id

        await client.disconnect()

        # Corrupt the stored resume token so the server cannot restore the
        # client, simulating an expired/invalid token.
        client._connection.resume_token = "invalid-token-xyz"
        await client.connect()

        assert client.connection_state.value == ConnectionState.CONNECTED
        assert client.client_id != original_id
