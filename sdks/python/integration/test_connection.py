"""Integration tests: connection lifecycle."""

from __future__ import annotations

import pytest

from starfish import ConnectionState, StarfishClient

from .conftest import create_client


@pytest.mark.asyncio
class TestConnection:
    async def test_connect_completes_handshake(self, clients: list[StarfishClient]):
        client = create_client("conn-test")
        clients.append(client)

        await client.connect()

        assert client.client_id is not None
        assert isinstance(client.client_id, str)
        assert client.connection_state.value == ConnectionState.CONNECTED

    async def test_disconnect_transitions_to_disconnected(self, clients: list[StarfishClient]):
        client = create_client("disc-test")
        clients.append(client)

        await client.connect()
        assert client.connection_state.value == ConnectionState.CONNECTED

        await client.disconnect()
        assert client.connection_state.value == ConnectionState.DISCONNECTED

    async def test_clock_sync_estimates_offset(self, clients: list[StarfishClient]):
        client = create_client("clock-test")
        clients.append(client)

        await client.connect()

        offset = await client.clock.sync(3)
        assert isinstance(offset, (int, float))
        assert abs(offset) < 5000
