"""Integration tests: presence."""

from __future__ import annotations

import asyncio

import pytest

from starfish import StarfishClient

from .conftest import create_client, unique_session


@pytest.mark.asyncio
class TestPresence:
    async def test_presence_set_observed_by_peer(self, clients: list[StarfishClient]):
        session = unique_session()

        setter = create_client("setter")
        clients.append(setter)
        await setter.connect()
        await setter.join(session)

        observer = create_client("observer")
        clients.append(observer)
        await observer.connect()
        await observer.join(session)

        updated: asyncio.Future[dict] = asyncio.get_event_loop().create_future()

        def on_presence(m: dict) -> None:
            if len(m) > 0 and not updated.done():
                updated.set_result(m)

        observer.presence.subscribe(on_presence)

        await setter.presence_set_async({"role": "dancer", "x": 0.5, "y": 0.8})

        presence_map = await asyncio.wait_for(updated, timeout=5.0)
        assert presence_map.get(setter.client_id) == {"role": "dancer", "x": 0.5, "y": 0.8}

    async def test_presence_set_full_replaces(self, clients: list[StarfishClient]):
        session = unique_session()

        setter = create_client("setter")
        clients.append(setter)
        await setter.connect()
        await setter.join(session)

        observer = create_client("observer")
        clients.append(observer)
        await observer.connect()
        await observer.join(session)

        update_count = 0
        second_update: asyncio.Future[dict] = asyncio.get_event_loop().create_future()

        def on_presence(m: dict) -> None:
            nonlocal update_count
            if setter.client_id in m:
                update_count += 1
                if update_count == 2 and not second_update.done():
                    second_update.set_result(dict(m))

        observer.presence.subscribe(on_presence)

        await setter.presence_set_async({"x": 1, "y": 2, "name": "foo"})
        await asyncio.sleep(0.2)
        await setter.presence_set_async({"x": 5, "y": 10})

        presence_map = await asyncio.wait_for(second_update, timeout=5.0)
        data = presence_map[setter.client_id]
        assert data == {"x": 5, "y": 10}
        assert "name" not in data
