import type { StarfishFrame } from "./types.js";
import type { StarfishServer } from "./starfish_server.js";
import type { Client } from "./client.js";
import type { Pool, MatchResult } from "./pool.js";
import { createErrorFrame, ERR_POOL_NOT_FOUND, ERR_POOL_NOT_MEMBER } from "./errors.js";

export function resolvePool(hub: StarfishServer, client: Client, frame: StarfishFrame): Pool | undefined {
  const payload = frame.payload as { pool?: string } | undefined;
  const pool = payload?.pool ? hub.getPool(payload.pool) : undefined;
  if (!pool) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_NOT_FOUND, "pool", frame.header.method));
  }
  return pool;
}

export function requirePoolMember(pool: Pool, hub: StarfishServer, client: Client, frame: StarfishFrame): boolean {
  if (!pool.hasMember(client.id)) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.header.id, ERR_POOL_NOT_MEMBER, "pool", frame.header.method));
    return false;
  }
  return true;
}

export function broadcastMemberJoined(
  hub: StarfishServer,
  pool: Pool,
  newMemberId: string,
  attributes: Record<string, unknown>,
): void {
  const frame: StarfishFrame = {
    header: {
      id: hub.idGen.messageId(),
      resource: "pool",
      method: "member-joined",
      kind: "event",
    },
    payload: { pool: pool.name, member: { id: newMemberId, attributes } },
  };

  if (pool.isClaimBased()) {
    for (const member of pool.getMembers()) {
      if (member.clientId !== newMemberId) {
        hub.getClient(member.clientId)?.sendFrame(frame);
      }
    }
  } else if (pool.mode === "delegated") {
    for (const member of pool.getMembers()) {
      if (member.clientId !== newMemberId && pool.isMatchmaker(member.clientId)) {
        hub.getClient(member.clientId)?.sendFrame(frame);
      }
    }
  }
}

export function broadcastMemberLeft(
  hub: StarfishServer,
  pool: Pool,
  memberId: string,
  reason: string,
): void {
  const frame: StarfishFrame = {
    header: {
      id: hub.idGen.messageId(),
      resource: "pool",
      method: "member-left",
      kind: "event",
    },
    payload: { pool: pool.name, memberId, reason },
  };

  if (pool.isClaimBased()) {
    for (const member of pool.getMembers()) {
      if (member.clientId !== memberId) {
        hub.getClient(member.clientId)?.sendFrame(frame);
      }
    }
  } else if (pool.mode === "delegated") {
    for (const member of pool.getMembers()) {
      if (member.clientId !== memberId && pool.isMatchmaker(member.clientId)) {
        hub.getClient(member.clientId)?.sendFrame(frame);
      }
    }
  }
}

export function sendMatchedToGroup(
  hub: StarfishServer,
  result: MatchResult,
  poolName: string,
): void {
  for (const peer of result.peers) {
    hub.getClient(peer.id)?.sendFrame({
      header: {
        id: hub.idGen.messageId(),
        resource: "pool",
        method: "matched",
        kind: "event",
      },
      payload: { pool: poolName, session: result.session, peers: result.peers },
    });
  }
}

export function broadcastMatchedMembersLeft(
  hub: StarfishServer,
  pool: Pool,
  matchedIds: string[],
): void {
  if (!pool.isClaimBased()) return;

  for (const matchedId of matchedIds) {
    const frame: StarfishFrame = {
      header: {
        id: hub.idGen.messageId(),
        resource: "pool",
        method: "member-left",
        kind: "event",
      },
      payload: { pool: pool.name, memberId: matchedId, reason: "matched" },
    };
    for (const member of pool.getMembers()) {
      hub.getClient(member.clientId)?.sendFrame(frame);
    }
  }
}
