"""Integration tests: topic pub/sub."""

from __future__ import annotations

import asyncio

import pytest

from starfish import StarfishClient, StarfishFrame

from .conftest import create_client, unique_session


@pytest.mark.asyncio
class TestTopics:
    async def test_subscribe_returns_confirmation(self, clients: list[StarfishClient]):
        session = unique_session()
        client = create_client("subscriber")
        clients.append(client)
        await client.connect()
        await client.join(session)

        response = await client.subscribe("lights")

        assert response.header.resource == "topic"
        assert response.header.method == "subscribe"
        assert response.header.kind == "response"

    async def test_topic_stream_receives_published_messages(self, clients: list[StarfishClient]):
        session = unique_session()

        subscriber = create_client("subscriber")
        clients.append(subscriber)
        await subscriber.connect()
        await subscriber.join(session)
        await subscriber.subscribe("lights")

        publisher = create_client("publisher")
        clients.append(publisher)
        await publisher.connect()
        await publisher.join(session)

        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        subscriber.topic_stream("lights").subscribe(
            lambda f: received.set_result(f) if not received.done() else None
        )

        await publisher.publish("lights", {"cue": "blackout"})

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.header.topic == "lights"
        assert message.payload == {"cue": "blackout"}
        assert message.header.from_ == publisher.client_id

    async def test_subscribe_with_callback(self, clients: list[StarfishClient]):
        session = unique_session()

        subscriber = create_client("subscriber")
        clients.append(subscriber)
        await subscriber.connect()
        await subscriber.join(session)

        received: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        await subscriber.subscribe(
            "events", lambda f: received.set_result(f) if not received.done() else None
        )

        publisher = create_client("publisher")
        clients.append(publisher)
        await publisher.connect()
        await publisher.join(session)

        await publisher.publish("events", {"action": "fire"})

        message = await asyncio.wait_for(received, timeout=5.0)
        assert message.payload == {"action": "fire"}

    async def test_unsubscribe_stops_delivery(self, clients: list[StarfishClient]):
        session = unique_session()

        subscriber = create_client("subscriber")
        clients.append(subscriber)
        await subscriber.connect()
        await subscriber.join(session)
        await subscriber.subscribe("lights")
        await subscriber.unsubscribe("lights")

        publisher = create_client("publisher")
        clients.append(publisher)
        await publisher.connect()
        await publisher.join(session)

        messages: list[StarfishFrame] = []
        subscriber.topic_stream("lights").subscribe(lambda f: messages.append(f))

        await publisher.publish("lights", {"cue": "go"})

        await asyncio.sleep(0.5)
        assert len(messages) == 0

    async def test_multiple_subscribers_receive_message(self, clients: list[StarfishClient]):
        session = unique_session()

        sub1 = create_client("sub1")
        clients.append(sub1)
        await sub1.connect()
        await sub1.join(session)
        await sub1.subscribe("events")

        sub2 = create_client("sub2")
        clients.append(sub2)
        await sub2.connect()
        await sub2.join(session)
        await sub2.subscribe("events")

        publisher = create_client("publisher")
        clients.append(publisher)
        await publisher.connect()
        await publisher.join(session)

        f1: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        f2: asyncio.Future[StarfishFrame] = asyncio.get_event_loop().create_future()
        sub1.topic_stream("events").subscribe(lambda f: f1.set_result(f) if not f1.done() else None)
        sub2.topic_stream("events").subscribe(lambda f: f2.set_result(f) if not f2.done() else None)

        await publisher.publish("events", {"action": "go"})

        msg1, msg2 = await asyncio.wait_for(asyncio.gather(f1, f2), timeout=5.0)
        assert msg1.payload == {"action": "go"}
        assert msg2.payload == {"action": "go"}
