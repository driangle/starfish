import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import {
  createErrorFrame,
  ERR_POOL_TARGET_NOT_FOUND,
  ERR_POOL_MODE_MISMATCH,
  ERR_POOL_ROLE_REQUIRED,
  ERR_POOL_INVALID_GROUP,
} from "./errors.js";
import {
  resolvePool,
  requirePoolMember,
  sendMatchedToGroup,
  broadcastMatchedMembersLeft,
} from "./pool_broadcast.js";

export function handlePoolClaim(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  if (!pool.isClaimBased()) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_MODE_MISMATCH));
    return;
  }

  const targetId = (frame.payload as { target?: string } | undefined)?.target;
  if (!targetId || !pool.hasMember(targetId)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_TARGET_NOT_FOUND));
    return;
  }

  if (pool.mode === "claim") {
    const result = pool.executeMatch([client.id, targetId], hub.idGen);
    sendMatchedToGroup(hub, result, pool.name);
    broadcastMatchedMembersLeft(hub, pool, [client.id, targetId]);
    client.pools.delete(pool.name);
    hub.getClient(targetId)?.pools.delete(pool.name);
    if (pool.isEmpty) hub.removePool(pool.name);
  } else if (pool.mode === "mutual") {
    if (pool.hasClaim(targetId, client.id)) {
      const result = pool.executeMatch([client.id, targetId], hub.idGen);
      sendMatchedToGroup(hub, result, pool.name);
      broadcastMatchedMembersLeft(hub, pool, [client.id, targetId]);
      client.pools.delete(pool.name);
      hub.getClient(targetId)?.pools.delete(pool.name);
      if (pool.isEmpty) hub.removePool(pool.name);
    } else {
      pool.addClaim(client.id, targetId);
      client.sendFrame({
        v: 1,
        id: hub.idGen.messageId(),
        type: "pool.claim.pending",
        replyTo: frame.id,
        payload: { pool: pool.name, target: targetId },
      });
    }
  } else if (pool.mode === "propose") {
    pool.addProposal(client.id, targetId);
    const member = pool.getMember(client.id)!;
    hub.getClient(targetId)?.sendFrame({
      v: 1,
      id: hub.idGen.messageId(),
      type: "pool.proposal",
      payload: { pool: pool.name, from: client.id, attributes: member.attributes },
    });
  }
}

export function handlePoolAccept(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  const proposerId = (frame.payload as { from?: string } | undefined)?.from;
  if (!proposerId || pool.getProposer(client.id) !== proposerId) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_TARGET_NOT_FOUND));
    return;
  }

  pool.removeProposal(client.id);
  const result = pool.executeMatch([proposerId, client.id], hub.idGen);
  sendMatchedToGroup(hub, result, pool.name);
  broadcastMatchedMembersLeft(hub, pool, [proposerId, client.id]);

  client.pools.delete(pool.name);
  hub.getClient(proposerId)?.pools.delete(pool.name);
  if (pool.isEmpty) hub.removePool(pool.name);
}

export function handlePoolReject(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  const proposerId = (frame.payload as { from?: string } | undefined)?.from;
  if (!proposerId || pool.getProposer(client.id) !== proposerId) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_TARGET_NOT_FOUND));
    return;
  }

  pool.removeProposal(client.id);
  hub.getClient(proposerId)?.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "pool.claim.rejected",
    payload: { pool: pool.name, target: client.id },
  });
}

export function handlePoolAssign(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  if (pool.mode !== "delegated") {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_MODE_MISMATCH));
    return;
  }
  if (!pool.isMatchmaker(client.id)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_ROLE_REQUIRED));
    return;
  }

  const groups = (frame.payload as { groups?: string[][] } | undefined)?.groups;
  if (!groups || !Array.isArray(groups)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_INVALID_GROUP));
    return;
  }

  for (const group of groups) {
    if (group.length !== pool.groupSize) {
      client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_INVALID_GROUP));
      return;
    }
    for (const memberId of group) {
      if (!pool.hasMember(memberId)) {
        client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_TARGET_NOT_FOUND));
        return;
      }
    }
  }

  const matched: { group: string[]; session: string }[] = [];
  for (const group of groups) {
    const result = pool.executeMatch(group, hub.idGen);
    sendMatchedToGroup(hub, result, pool.name);
    matched.push({ group, session: result.session });

    for (const memberId of group) {
      client.sendFrame({
        v: 1,
        id: hub.idGen.messageId(),
        type: "pool.member.left",
        payload: { pool: pool.name, memberId, reason: "matched" },
      });
      hub.getClient(memberId)?.pools.delete(pool.name);
    }
  }

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "pool.assigned",
    replyTo: frame.id,
    payload: { pool: pool.name, matched },
  });

  if (pool.isEmpty) hub.removePool(pool.name);
}
