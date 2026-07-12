"""Integration tests: session management."""

from __future__ import annotations

import asyncio

import pytest

from starfish import StarfishClient

from .conftest import create_client, unique_session


@pytest.mark.asyncio
class TestSession:
    async def test_join_creates_session(self, clients: list[StarfishClient]):
        client = create_client("joiner")
        clients.append(client)
        await client.connect()

        session = unique_session()
        response = await client.join(session)

        assert response.type == "session.joined"
        assert response.session == session
        assert len(response.payload["clients"]) == 1
        assert response.payload["clients"][0]["id"] == client.client_id

    async def test_clients_includes_all_members(self, clients: list[StarfishClient]):
        session = unique_session()

        client1 = create_client("first")
        clients.append(client1)
        await client1.connect()
        await client1.join(session)

        client2 = create_client("second")
        clients.append(client2)
        await client2.connect()
        await client2.join(session)

        ids = [c.id for c in client2.clients.value]
        assert client1.client_id in ids
        assert client2.client_id in ids

    async def test_peers_excludes_self(self, clients: list[StarfishClient]):
        session = unique_session()

        client1 = create_client("first")
        clients.append(client1)
        await client1.connect()
        await client1.join(session)

        client2 = create_client("second")
        clients.append(client2)
        await client2.connect()
        await client2.join(session)

        peer_ids = [c.id for c in client2.peers.value]
        assert client1.client_id in peer_ids
        assert client2.client_id not in peer_ids

    async def test_client_connected_updates_clients(self, clients: list[StarfishClient]):
        session = unique_session()

        client1 = create_client("first")
        clients.append(client1)
        await client1.connect()
        await client1.join(session)

        assert len(client1.clients.value) == 1

        connected_future: asyncio.Future[list] = asyncio.get_event_loop().create_future()

        def on_clients(c: list) -> None:
            if len(c) == 2 and not connected_future.done():
                connected_future.set_result(c)

        client1.clients.subscribe(on_clients)

        client2 = create_client("second")
        clients.append(client2)
        await client2.connect()
        await client2.join(session)

        updated = await asyncio.wait_for(connected_future, timeout=5.0)
        assert len(updated) == 2

    async def test_leave_clears_session_state(self, clients: list[StarfishClient]):
        client = create_client("leaver")
        clients.append(client)
        await client.connect()
        await client.join(unique_session())

        assert len(client.clients.value) > 0

        await client.leave()

        assert client.clients.value == []
        assert client.peers.value == []
