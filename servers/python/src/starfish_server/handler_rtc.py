from __future__ import annotations

from typing import TYPE_CHECKING

from .client import Client
from .errors import ERR_CLIENT_NOT_FOUND, ERR_PROTOCOL_INVALID_FRAME, ERR_SESSION_NOT_FOUND, create_error_frame
from .types import StarfishFrame, parse_to

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_rtc_connect(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _relay_rtc(hub, client, frame)


def handle_rtc_offer(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _relay_rtc(hub, client, frame)


def handle_rtc_answer(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _relay_rtc(hub, client, frame)


def handle_rtc_ice(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    _relay_rtc(hub, client, frame)


def _relay_rtc(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    targets = parse_to(header.get("to"))

    if len(targets) != 1:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "rtc", header.get("method"))
        )
        return

    target_id = targets[0]
    session_name = header.get("session")

    session = hub.get_session(session_name) if session_name else None
    if session is None:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_SESSION_NOT_FOUND, "rtc", header.get("method"))
        )
        return

    target = session.get_client(target_id)
    if target is None:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_CLIENT_NOT_FOUND, "rtc", header.get("method"))
        )
        return

    target.send_frame({
        "header": {
            "id": header.get("id", ""),
            "resource": "rtc",
            "method": header.get("method"),
            "kind": "event",
            "session": session_name,
            "from": client.id,
            "to": target_id,
        },
        "payload": frame.get("payload"),
    })
