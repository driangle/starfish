from __future__ import annotations

import time
from typing import TYPE_CHECKING

from .client import Client
from .errors import ERR_PROTOCOL_INVALID_FRAME, create_error_frame
from .types import StarfishFrame, parse_to

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_clock_sync(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    now = int(time.time() * 1000)
    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "clock",
            "method": "sync",
            "kind": "response",
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok", "serverTime": now},
    })


def handle_ack(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _route_reply(hub, client, frame)


def handle_nack(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _route_reply(hub, client, frame)


def _route_reply(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})

    if not header.get("replyTo"):
        client.send_frame(
            create_error_frame(
                hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, header.get("resource"), header.get("method")
            )
        )
        return

    header["from"] = client.id
    targets = parse_to(header.get("to"))
    if not targets:
        return

    for target_id in targets:
        target = hub.get_client(target_id)
        if target:
            target.send_frame(frame)
