"""Integration tests: shared data operations."""

from __future__ import annotations

import asyncio

import pytest

from starfish import ConflictError, DataResult, SaveOptions, StarfishClient
from starfish.pending import StarfishRequestError

from .conftest import create_client, unique_session


@pytest.mark.asyncio
class TestData:
    async def test_save_and_get_roundtrip(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("data-test")
        clients.append(client)
        await client.connect()
        await client.join(session)

        saved = await client.save(SaveOptions(key="score", scope="session", op="replace", data=42))

        assert saved.key == "score"
        assert saved.data == 42
        assert saved.version >= 1

        fetched = await client.get("score", "session")
        assert fetched.data == 42
        assert fetched.version == saved.version

    async def test_save_merge(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("merge-test")
        clients.append(client)
        await client.connect()
        await client.join(session)

        await client.save(
            SaveOptions(key="config", scope="session", op="replace", data={"a": 1, "b": 2})
        )
        await client.save(
            SaveOptions(key="config", scope="session", op="merge", data={"b": 99, "c": 3})
        )

        result = await client.get("config", "session")
        assert result.data == {"a": 1, "b": 99, "c": 3}

    async def test_counter_add(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("counter-test")
        clients.append(client)
        await client.connect()
        await client.join(session)

        await client.save(SaveOptions(key="counter", scope="session", op="replace", data=10))
        result = await client.save(
            SaveOptions(key="counter", scope="session", op="counter.add", data=5)
        )

        assert result.data == 15

    async def test_expected_version_succeeds(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("occ-test")
        clients.append(client)
        await client.connect()
        await client.join(session)

        v1 = await client.save(
            SaveOptions(
                key="versioned", scope="session", op="replace", data="v1", expected_version=0
            )
        )
        assert v1.version == 1

        v2 = await client.save(
            SaveOptions(
                key="versioned", scope="session", op="replace", data="v2", expected_version=1
            )
        )
        assert v2.version == 2
        assert v2.data == "v2"

    async def test_expected_version_rejects_mismatch(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("conflict-test")
        clients.append(client)
        await client.connect()
        await client.join(session)

        await client.save(
            SaveOptions(key="conflict", scope="session", op="replace", data="original")
        )

        with pytest.raises((ConflictError, RuntimeError, StarfishRequestError)):
            await client.save(
                SaveOptions(
                    key="conflict",
                    scope="session",
                    op="replace",
                    data="bad",
                    expected_version=999,
                )
            )

    async def test_data_changed_events(self, clients: list[StarfishClient]):
        session = unique_session()

        writer = create_client("writer")
        clients.append(writer)
        await writer.connect()
        await writer.join(session)

        observer = create_client("observer")
        clients.append(observer)
        await observer.connect()
        await observer.join(session)

        changed: asyncio.Future[DataResult] = asyncio.get_event_loop().create_future()
        observer.data_changed.subscribe(
            lambda r: changed.set_result(r) if not changed.done() else None
        )

        await writer.save(SaveOptions(key="color", scope="session", op="replace", data="blue"))

        result = await asyncio.wait_for(changed, timeout=5.0)
        assert result.key == "color"
        assert result.data == "blue"

    async def test_key_stream_filters(self, clients: list[StarfishClient]):
        session = unique_session()

        writer = create_client("writer")
        clients.append(writer)
        await writer.connect()
        await writer.join(session)

        observer = create_client("observer")
        clients.append(observer)
        await observer.connect()
        await observer.join(session)

        color_changes: list[DataResult] = []
        score_changes: list[DataResult] = []
        observer.data_key_stream("color").subscribe(lambda r: color_changes.append(r))
        observer.data_key_stream("score").subscribe(lambda r: score_changes.append(r))

        await writer.save(SaveOptions(key="color", scope="session", op="replace", data="red"))
        await writer.save(SaveOptions(key="score", scope="session", op="replace", data=100))

        await asyncio.sleep(0.5)

        assert len(color_changes) == 1
        assert color_changes[0].data == "red"
        assert len(score_changes) == 1
        assert score_changes[0].data == 100
