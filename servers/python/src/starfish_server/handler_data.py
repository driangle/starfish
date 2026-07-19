from __future__ import annotations

import json
from typing import TYPE_CHECKING, Any

from .client import Client
from .data_store import ConflictError
from .errors import (
    ERR_DATA_CONFLICT,
    ERR_DATA_INVALID_OP,
    ERR_PAYLOAD_TOO_LARGE,
    ERR_PROTOCOL_INVALID_FRAME,
    create_error_frame,
)
from .limits import MAX_DATA_VALUE_SIZE
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_data_save(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    key = payload.get("key")
    scope = payload.get("scope")

    if not key or scope not in ("session", "self"):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "data", "save")
        )
        return

    data = payload.get("data")
    data_size = len(json.dumps(data if data is not None else None))
    if data_size > MAX_DATA_VALUE_SIZE:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PAYLOAD_TOO_LARGE, "data", "save")
        )
        return

    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    op = payload.get("op", "replace")
    expected_version = payload.get("expectedVersion")

    try:
        entry = session.data.apply(op, key, scope, client.id, data, expected_version)
    except ConflictError as e:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_DATA_CONFLICT, "data", "save", {
                "key": key,
                "expectedVersion": expected_version,
                "actualVersion": e.actual_version,
                "currentData": e.current_data,
            })
        )
        return
    except (ValueError, Exception):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_DATA_INVALID_OP, "data", "save")
        )
        return

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "data",
            "method": "save",
            "kind": "response",
            "session": session_name,
            "replyTo": header.get("id", ""),
        },
        "payload": {
            "status": "ok",
            "key": key,
            "scope": scope,
            "data": entry.data,
            "version": entry.version,
        },
    })

    if scope == "session":
        session.broadcast(
            {
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "data",
                    "method": "changed",
                    "kind": "event",
                    "session": session_name,
                },
                "payload": {
                    "key": key,
                    "scope": scope,
                    "op": op,
                    "data": entry.data,
                    "version": entry.version,
                    "updatedBy": client.id,
                },
            },
            exclude_id="",
        )


def handle_data_get(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    key = payload.get("key")
    scope = payload.get("scope")

    if not key or scope not in ("session", "self"):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "data", "get")
        )
        return

    session_name = header["session"]
    session = hub.get_session(session_name)
    assert session is not None

    entry = session.data.get(key, scope, client.id)

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "data",
            "method": "get",
            "kind": "response",
            "session": session_name,
            "replyTo": header.get("id", ""),
        },
        "payload": {
            "status": "ok",
            "key": key,
            "scope": scope,
            "data": entry.data,
            "version": entry.version,
        },
    })
