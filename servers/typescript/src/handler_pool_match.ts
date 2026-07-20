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

  // Mode is checked before membership: claiming in a non-claim pool is a mode
  // mismatch regardless of whether the caller is still a member.
  if (!pool.isClaimBased()) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_MODE_MISMATCH, "pool", "claim"));
    return;
  }

  if (!requirePoolMember(pool, hub, client, frame)) return;

  const targetId = (frame.payload as { target?: string } | undefined)?.target;
  if (!targetId || !pool.hasMember(targetId)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_TARGET_NOT_FOUND, "pool", "claim"));
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
        header: {
          id: hub.idGen.messageId(),
          resource: "pool",
          method: "claim",
          kind: "response",
          replyTo: frame.header.id,
        },
        payload: { status: "pending", pool: pool.name, target: targetId },
      });
    }
  } else if (pool.mode === "propose") {
    pool.addProposal(client.id, targetId);
    const member = pool.getMember(client.id)!;
    hub.getClient(targetId)?.sendFrame({
      header: {
        id: hub.idGen.messageId(),
        resource: "pool",
        method: "proposal",
        kind: "event",
      },
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
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_TARGET_NOT_FOUND, "pool", "accept"));
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
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_TARGET_NOT_FOUND, "pool", "reject"));
    return;
  }

  pool.removeProposal(client.id);
  hub.getClient(proposerId)?.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "pool",
      method: "claim-rejected",
      kind: "event",
    },
    payload: { pool: pool.name, target: client.id },
  });
}

export function handlePoolAssign(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  if (pool.mode !== "delegated") {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_MODE_MISMATCH, "pool", "assign"));
    return;
  }
  if (!pool.isMatchmaker(client.id)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_ROLE_REQUIRED, "pool", "assign"));
    return;
  }

  const groups = (frame.payload as { groups?: string[][] } | undefined)?.groups;
  if (!groups || !Array.isArray(groups)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_INVALID_GROUP, "pool", "assign"));
    return;
  }

  for (const group of groups) {
    if (group.length !== pool.groupSize) {
      client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_INVALID_GROUP, "pool", "assign"));
      return;
    }
    for (const memberId of group) {
      if (!pool.hasMember(memberId)) {
        client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_TARGET_NOT_FOUND, "pool", "assign"));
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
        header: {
          id: hub.idGen.messageId(),
          resource: "pool",
          method: "member-left",
          kind: "event",
        },
        payload: { pool: pool.name, memberId, reason: "matched" },
      });
      hub.getClient(memberId)?.pools.delete(pool.name);
    }
  }

  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "pool",
      method: "assign",
      kind: "response",
      replyTo: frame.header.id,
    },
    payload: { status: "ok", pool: pool.name, matched },
  });

  if (pool.isEmpty) hub.removePool(pool.name);
}
