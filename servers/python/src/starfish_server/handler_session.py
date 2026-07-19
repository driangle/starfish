from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .client import Client
from .errors import ERR_PROTOCOL_INVALID_FRAME, ERR_SESSION_NOT_FOUND, create_error_frame
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_session_join(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    session_name = header.get("session")

    if not session_name:
        client.send_frame(create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "session", "join"))
        return

    payload = frame.get("payload") or {}

    session = hub.get_session(session_name)
    if session is None:
        if not payload.get("create"):
            client.send_frame(
                create_error_frame(hub.id_gen, header.get("id", ""), ERR_SESSION_NOT_FOUND, "session", "join")
            )
            return
        session = hub.get_or_create_session(session_name)

    clients = session.add_client(client)
    client.sessions.add(session_name)

    if payload.get("name"):
        client.name = payload["name"]
    if payload.get("role"):
        client.role = payload["role"]
    if payload.get("meta") is not None:
        client.meta = payload["meta"]

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "session",
            "method": "join",
            "kind": "response",
            "session": session_name,
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok", "clientId": client.id, "clients": clients},
    })

    session.broadcast(
        {
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "session",
                "method": "connected",
                "kind": "event",
                "session": session_name,
            },
            "payload": {"client": client.info().to_dict()},
        },
        exclude_id=client.id,
    )


def handle_session_leave(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    session_name = header.get("session")

    if not session_name:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "session", "leave")
        )
        return

    if session_name not in client.sessions:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_SESSION_NOT_FOUND, "session", "leave")
        )
        return

    remove_client_from_session(hub, client, session_name, "left")

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "session",
            "method": "leave",
            "kind": "response",
            "session": session_name,
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok"},
    })


def remove_client_from_session(
    hub: StarfishServer,
    client: Client,
    session_name: str,
    reason: str,
) -> None:
    session = hub.get_session(session_name)
    if session is None:
        return

    client.sessions.discard(session_name)
    empty = session.remove_client(client.id)

    session.broadcast({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "session",
            "method": "disconnected",
            "kind": "event",
            "session": session_name,
        },
        "payload": {"clientId": client.id, "reason": reason},
    })

    if empty:
        hub.remove_session(session_name)
