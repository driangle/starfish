"""Integration tests: direct messaging and broadcast."""

from __future__ import annotations

import asyncio

import pytest

from starfish import StarfishClient, StarfishFrame

from .conftest import create_client, unique_session


@pytest.mark.asyncio
class TestMessaging:
    async def test_send_delivers_direct_message(self, clients: list[StarfishClient]):
        session = unique_session()

        sender = create_client("sender")
        clients.append(sender)
        await sender.connect()
        await sender.join(session)

        receiver = create_client("receiver")
        clients.append(receiver)
        await receiver.connect()
        await receiver.join(session)

        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        receiver.on(
            lambda f: (
                received.set_result(f)
                if f.header.resource == "message"
                and f.header.method == "message"
                and not received.done()
                else None
            )
        )

        await sender.send(receiver.client_id, {"gesture": "wave"})

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.header.from_ == sender.client_id
        assert message.payload == {"gesture": "wave"}

    async def test_send_to_multiple_recipients(self, clients: list[StarfishClient]):
        session = unique_session()

        sender = create_client("sender")
        clients.append(sender)
        await sender.connect()
        await sender.join(session)

        recv1 = create_client("recv1")
        clients.append(recv1)
        await recv1.connect()
        await recv1.join(session)

        recv2 = create_client("recv2")
        clients.append(recv2)
        await recv2.connect()
        await recv2.join(session)

        f1: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        f2: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        recv1.on(
            lambda f: (
                f1.set_result(f)
                if f.header.resource == "message" and f.header.method == "message" and not f1.done()
                else None
            )
        )
        recv2.on(
            lambda f: (
                f2.set_result(f)
                if f.header.resource == "message" and f.header.method == "message" and not f2.done()
                else None
            )
        )

        await sender.send([recv1.client_id, recv2.client_id], {"command": "stop"})

        m1, m2 = await asyncio.wait_for(asyncio.gather(f1, f2), timeout=5.0)
        assert m1.payload == {"command": "stop"}
        assert m2.payload == {"command": "stop"}

    async def test_broadcast_delivers_to_session(self, clients: list[StarfishClient]):
        session = unique_session()

        broadcaster = create_client("broadcaster")
        clients.append(broadcaster)
        await broadcaster.connect()
        await broadcaster.join(session)

        listener = create_client("listener")
        clients.append(listener)
        await listener.connect()
        await listener.join(session)

        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        listener.on(
            lambda f: (
                received.set_result(f)
                if f.header.resource == "session"
                and f.header.method == "broadcast"
                and not received.done()
                else None
            )
        )

        await broadcaster.broadcast({"alert": "go"})

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.header.from_ == broadcaster.client_id
        assert message.payload == {"alert": "go"}

    async def test_broadcast_with_include_self(self, clients: list[StarfishClient]):
        session = unique_session()

        client = create_client("self-bcast")
        clients.append(client)
        await client.connect()
        await client.join(session)

        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        client.on(
            lambda f: (
                received.set_result(f)
                if f.header.resource == "session"
                and f.header.method == "broadcast"
                and not received.done()
                else None
            )
        )

        await client.broadcast({"echo": True}, include_self=True)

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.payload == {"echo": True}
