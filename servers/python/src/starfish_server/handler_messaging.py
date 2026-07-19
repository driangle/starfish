from __future__ import annotations

from typing import TYPE_CHECKING

from .client import Client
from .errors import ERR_CLIENT_NOT_FOUND, create_error_frame
from .types import StarfishFrame, include_self, parse_to

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_client_send(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    targets = parse_to(header.get("to"))

    for target_id in targets:
        target = session.get_client(target_id)
        if target is None:
            client.send_frame(
                create_error_frame(hub.id_gen, header.get("id", ""), ERR_CLIENT_NOT_FOUND, "message", "send")
            )
            continue
        target.send_frame({
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "message",
                "method": "message",
                "kind": "event",
                "session": session_name,
                "from": client.id,
                "to": target_id,
            },
            "payload": frame.get("payload"),
        })


def handle_session_broadcast(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    exclude_id = None if include_self(frame) else client.id

    session.broadcast(
        {
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "session",
                "method": "broadcast",
                "kind": "event",
                "session": session_name,
                "from": client.id,
            },
            "payload": frame.get("payload"),
        },
        exclude_id=exclude_id,
    )
