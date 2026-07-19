from __future__ import annotations

from typing import TYPE_CHECKING, Any

from .client import Client
from .errors import ERR_POOL_NOT_FOUND, ERR_POOL_NOT_MEMBER, create_error_frame
from .pool import MatchResult, Pool
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def resolve_pool(hub: StarfishServer, client: Client, frame: StarfishFrame) -> Pool | None:
    payload = frame.get("payload") or {}
    pool_name = payload.get("pool")
    pool = hub.get_pool(pool_name) if pool_name else None
    if pool is None:
        header = frame.get("header", {})
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_NOT_FOUND, "pool", header.get("method"))
        )
    return pool


def require_pool_member(pool: Pool, hub: StarfishServer, client: Client, frame: StarfishFrame) -> bool:
    if not pool.has_member(client.id):
        header = frame.get("header", {})
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_NOT_MEMBER, "pool", header.get("method"))
        )
        return False
    return True


def send_matched_to_group(hub: StarfishServer, result: MatchResult, pool_name: str) -> None:
    for peer in result.peers:
        c = hub.get_client(peer["id"])
        if c:
            c.send_frame({
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "pool",
                    "method": "matched",
                    "kind": "event",
                },
                "payload": {"pool": pool_name, "session": result.session, "peers": result.peers},
            })


def broadcast_matched_members_left(hub: StarfishServer, pool: Pool, matched_ids: list[str]) -> None:
    if not pool.is_claim_based():
        return
    for matched_id in matched_ids:
        frame: StarfishFrame = {
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "pool",
                "method": "member-left",
                "kind": "event",
            },
            "payload": {"pool": pool.name, "memberId": matched_id, "reason": "matched"},
        }
        for member in pool.get_members():
            c = hub.get_client(member.client_id)
            if c:
                c.send_frame(frame)


def broadcast_pool_member_joined(
    hub: StarfishServer,
    pool: Pool,
    client_id: str,
    attributes: dict,
) -> None:
    frame: StarfishFrame = {
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "pool",
            "method": "member-joined",
            "kind": "event",
        },
        "payload": {
            "pool": pool.name,
            "member": {"id": client_id, "attributes": attributes},
        },
    }

    if pool.is_claim_based():
        for member in pool.get_members():
            if member.client_id != client_id:
                c = hub.get_client(member.client_id)
                if c:
                    c.send_frame(frame)
    elif pool.mode == "delegated":
        for member in pool.get_members():
            if member.client_id != client_id and pool.is_matchmaker(member.client_id):
                c = hub.get_client(member.client_id)
                if c:
                    c.send_frame(frame)


def broadcast_pool_member_left(
    hub: StarfishServer,
    pool: Pool,
    member_id: str,
    reason: str,
) -> None:
    frame: StarfishFrame = {
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "pool",
            "method": "member-left",
            "kind": "event",
        },
        "payload": {"pool": pool.name, "memberId": member_id, "reason": reason},
    }

    if pool.is_claim_based():
        for member in pool.get_members():
            if member.client_id != member_id:
                c = hub.get_client(member.client_id)
                if c:
                    c.send_frame(frame)
    elif pool.mode == "delegated":
        for member in pool.get_members():
            if member.client_id != member_id and pool.is_matchmaker(member.client_id):
                c = hub.get_client(member.client_id)
                if c:
                    c.send_frame(frame)
