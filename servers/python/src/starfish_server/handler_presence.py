from __future__ import annotations

import json
from typing import TYPE_CHECKING

from .client import Client
from .errors import ERR_PAYLOAD_TOO_LARGE, create_error_frame
from .limits import MAX_PRESENCE_SIZE
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_presence_set(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    payload = frame.get("payload")

    payload_size = len(json.dumps(payload if payload is not None else None))
    if payload_size > MAX_PRESENCE_SIZE:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PAYLOAD_TOO_LARGE, "presence", "set")
        )
        return

    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None
    session.set_presence(client.id, payload)
