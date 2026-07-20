from __future__ import annotations

from typing import TYPE_CHECKING

from .client import Client
from .errors import (
    ERR_POOL_INVALID_GROUP,
    ERR_POOL_MODE_MISMATCH,
    ERR_POOL_ROLE_REQUIRED,
    ERR_POOL_TARGET_NOT_FOUND,
    create_error_frame,
)
from .pool_broadcast import (
    broadcast_matched_members_left,
    require_pool_member,
    resolve_pool,
    send_matched_to_group,
)
from .types import StarfishFrame

if TYPE_CHECKING:
    from .server import StarfishServer


def handle_pool_claim(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    pool = resolve_pool(hub, client, frame)
    if pool is None:
        return

    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    # Mode is checked before membership: claiming in a non-claim pool is a mode
    # mismatch regardless of whether the caller is still a member.
    if not pool.is_claim_based():
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_MODE_MISMATCH, "pool", "claim")
        )
        return

    if not require_pool_member(pool, hub, client, frame):
        return

    target_id = payload.get("target")
    if not target_id or not pool.has_member(target_id):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_TARGET_NOT_FOUND, "pool", "claim")
        )
        return

    if pool.mode == "claim":
        result = pool.execute_match([client.id, target_id], hub.id_gen)
        send_matched_to_group(hub, result, pool.name)
        broadcast_matched_members_left(hub, pool, [client.id, target_id])
        client.pools.discard(pool.name)
        target = hub.get_client(target_id)
        if target:
            target.pools.discard(pool.name)
        if pool.is_empty:
            hub.remove_pool(pool.name)

    elif pool.mode == "mutual":
        if pool.has_claim(target_id, client.id):
            result = pool.execute_match([client.id, target_id], hub.id_gen)
            send_matched_to_group(hub, result, pool.name)
            broadcast_matched_members_left(hub, pool, [client.id, target_id])
            client.pools.discard(pool.name)
            target = hub.get_client(target_id)
            if target:
                target.pools.discard(pool.name)
            if pool.is_empty:
                hub.remove_pool(pool.name)
        else:
            pool.add_claim(client.id, target_id)
            client.send_frame({
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "pool",
                    "method": "claim",
                    "kind": "response",
                    "replyTo": header.get("id", ""),
                },
                "payload": {"status": "pending", "pool": pool.name, "target": target_id},
            })

    elif pool.mode == "propose":
        pool.add_proposal(client.id, target_id)
        member = pool.get_member(client.id)
        target = hub.get_client(target_id)
        if target and member:
            target.send_frame({
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "pool",
                    "method": "proposal",
                    "kind": "event",
                },
                "payload": {"pool": pool.name, "from": client.id, "attributes": member.attributes},
            })


def handle_pool_accept(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    pool = resolve_pool(hub, client, frame)
    if pool is None:
        return
    if not require_pool_member(pool, hub, client, frame):
        return

    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    proposer_id = payload.get("from")
    if not proposer_id or pool.get_proposer(client.id) != proposer_id:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_TARGET_NOT_FOUND, "pool", "accept")
        )
        return

    pool.remove_proposal(client.id)
    result = pool.execute_match([proposer_id, client.id], hub.id_gen)
    send_matched_to_group(hub, result, pool.name)
    broadcast_matched_members_left(hub, pool, [proposer_id, client.id])

    client.pools.discard(pool.name)
    proposer = hub.get_client(proposer_id)
    if proposer:
        proposer.pools.discard(pool.name)
    if pool.is_empty:
        hub.remove_pool(pool.name)


def handle_pool_reject(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    pool = resolve_pool(hub, client, frame)
    if pool is None:
        return
    if not require_pool_member(pool, hub, client, frame):
        return

    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    proposer_id = payload.get("from")
    if not proposer_id or pool.get_proposer(client.id) != proposer_id:
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_TARGET_NOT_FOUND, "pool", "reject")
        )
        return

    pool.remove_proposal(client.id)
    proposer = hub.get_client(proposer_id)
    if proposer:
        proposer.send_frame({
            "header": {
                "id": hub.id_gen.message_id(),
                "resource": "pool",
                "method": "claim-rejected",
                "kind": "event",
            },
            "payload": {"pool": pool.name, "target": client.id},
        })


def handle_pool_assign(hub: StarfishServer, client: Client, frame: StarfishFrame) -> None:
    pool = resolve_pool(hub, client, frame)
    if pool is None:
        return
    if not require_pool_member(pool, hub, client, frame):
        return

    header = frame.get("header", {})
    payload = frame.get("payload") or {}

    if pool.mode != "delegated":
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_MODE_MISMATCH, "pool", "assign")
        )
        return

    if not pool.is_matchmaker(client.id):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_ROLE_REQUIRED, "pool", "assign")
        )
        return

    groups = payload.get("groups")
    if not groups or not isinstance(groups, list):
        client.send_frame(
            create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_INVALID_GROUP, "pool", "assign")
        )
        return

    for group in groups:
        if len(group) != pool.group_size:
            client.send_frame(
                create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_INVALID_GROUP, "pool", "assign")
            )
            return
        for member_id in group:
            if not pool.has_member(member_id):
                client.send_frame(
                    create_error_frame(hub.id_gen, header.get("id", ""), ERR_POOL_TARGET_NOT_FOUND, "pool", "assign")
                )
                return

    matched: list[dict] = []
    for group in groups:
        result = pool.execute_match(group, hub.id_gen)
        send_matched_to_group(hub, result, pool.name)
        matched.append({"group": group, "session": result.session})

        for member_id in group:
            client.send_frame({
                "header": {
                    "id": hub.id_gen.message_id(),
                    "resource": "pool",
                    "method": "member-left",
                    "kind": "event",
                },
                "payload": {"pool": pool.name, "memberId": member_id, "reason": "matched"},
            })
            c = hub.get_client(member_id)
            if c:
                c.pools.discard(pool.name)

    client.send_frame({
        "header": {
            "id": hub.id_gen.message_id(),
            "resource": "pool",
            "method": "assign",
            "kind": "response",
            "replyTo": header.get("id", ""),
        },
        "payload": {"status": "ok", "pool": pool.name, "matched": matched},
    })

    if pool.is_empty:
        hub.remove_pool(pool.name)
