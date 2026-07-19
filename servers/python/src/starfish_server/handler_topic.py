from __future__ import annotations

from typing import TYPE_CHECKING

from .client import Client
from .errors import ERR_TOPIC_INVALID, create_error_frame
from .limits import MAX_TOPIC_NAME_LENGTH
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def _validate_topic(hub: StarfishServer, client: Client, frame: StarfishFrame) -> str | None:
    header = frame.get("header", {})
    topic = header.get("topic")
    if not topic or not isinstance(topic, str) or len(topic) > MAX_TOPIC_NAME_LENGTH:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_TOPIC_INVALID, "topic", header.get("method"))
        )
        return None
    return topic


def handle_topic_subscribe(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    topic = _validate_topic(hub, client, frame)
    if topic is None:
        return

    header = frame.get("header", {})
    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    session.subscribe(topic, client)

    if session_name not in client.topics:
        client.topics[session_name] = set()
    client.topics[session_name].add(topic)

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "topic",
            "method": "subscribe",
            "kind": "response",
            "session": session_name,
            "topic": topic,
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok"},
    })

    _send_topic_peers(hub, session, topic)


def handle_topic_unsubscribe(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    topic = _validate_topic(hub, client, frame)
    if topic is None:
        return

    header = frame.get("header", {})
    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    session.unsubscribe(topic, client.id)

    session_topics = client.topics.get(session_name)
    if session_topics:
        session_topics.discard(topic)
        if not session_topics:
            del client.topics[session_name]

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "topic",
            "method": "unsubscribe",
            "kind": "response",
            "session": session_name,
            "topic": topic,
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok"},
    })

    _send_topic_peers(hub, session, topic)


def handle_topic_publish(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    topic = _validate_topic(hub, client, frame)
    if topic is None:
        return

    header = frame.get("header", {})
    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    subscribers = session.get_subscribers(topic)
    for sub in subscribers:
        sub.send_frame({
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "topic",
                "method": "message",
                "kind": "event",
                "session": session_name,
                "topic": topic,
                "from": client.id,
            },
            "payload": frame.get("payload"),
        })


def _send_topic_peers(hub: StarfishServer, session: object, topic: str) -> None:
    from .session import Session
    assert isinstance(session, Session)

    subscriber_ids = session.get_topic_subscriber_ids(topic)
    subscribers = session.get_subscribers(topic)

    frame: StarfishFrame = {
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "topic",
            "method": "peers",
            "kind": "event",
            "topic": topic,
        },
        "payload": {"subscribers": subscriber_ids},
    }

    for sub in subscribers:
        sub.send_frame(frame)
