from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .client import Client
from .errors import ERR_POOL_NOT_FOUND, ERR_POOL_NOT_MEMBER, create_error_frame
from .pool_broadcast import broadcast_pool_member_joined, broadcast_pool_member_left
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_pool_enter(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    pool_name = payload.get("pool")
    if not pool_name:
        from .errors import ERR_PROTOCOL_INVALID_FRAME
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "pool", "enter")
        )
        return

    create = payload.get("create", False)
    mode = payload.get("mode", "auto")
    group_size = payload.get("groupSize", 2)
    role = payload.get("role", "member")
    attributes = payload.get("attributes", {})
    filter_val = payload.get("filter")

    pool = hub.get_pool(pool_name)
    if pool is None:
        if not create:
            client.send_frame(
                create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_NOT_FOUND, "pool", "enter")
            )
            return
        pool = hub.get_or_create_pool(pool_name, mode, group_size)

    pool.add_member(client.id, role, attributes, filter_val)
    client.pools.add(pool_name)

    # Build response
    response_payload: dict[str, Any] = {
        "status": "ok",
        "pool": pool_name,
        "mode": pool.mode,
        "groupSize": pool.group_size,
    }

    if pool.is_claim_based():
        response_payload["members"] = pool.get_member_list(exclude_id=client.id)

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "pool",
            "method": "enter",
            "kind": "response",
            "replyTo": header.get("id", ""),
        },
        "payload": response_payload,
    })

    # Broadcast member joined
    broadcast_pool_member_joined(hub, pool, client.id, attributes)

    # Try auto-match
    if pool.mode == "auto":
        match = pool.try_auto_match(hub.id_gen)
        if match:
            _send_match(hub, pool, match)


def handle_pool_leave(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    pool_name = payload.get("pool")
    if not pool_name:
        from .errors import ERR_PROTOCOL_INVALID_FRAME
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_PROTOCOL_INVALID_FRAME, "pool", "leave")
        )
        return

    pool = hub.get_pool(pool_name)
    if pool is None or not pool.has_member(client.id):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_NOT_MEMBER, "pool", "leave")
        )
        return

    broadcast_pool_member_left(hub, pool, client.id, "left")
    pool.remove_member(client.id)
    client.pools.discard(pool_name)

    if pool.is_empty:
        hub.remove_pool(pool_name)

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "pool",
            "method": "leave",
            "kind": "response",
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok", "pool": pool_name},
    })


def _send_match(hub: StarfishServer, pool: object, match: Any) -> None:
    from .pool import MatchResult
    assert isinstance(match, MatchResult)

    for peer in match.peers:
        client = hub.get_client(peer["id"])
        if client:
            client.pools.discard(pool.name if hasattr(pool, "name") else "")
            client.send_frame({
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "pool",
                    "method": "matched",
                    "kind": "event",
                },
                "payload": {
                    "pool": pool.name if hasattr(pool, "name") else "",
                    "session": match.session,
                    "peers": match.peers,
                },
            })
