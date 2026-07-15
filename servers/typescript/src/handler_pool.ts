import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import type { PoolMode } from "./pool.js";
import { createErrorFrame, ERR_POOL_NOT_FOUND } from "./errors.js";
import {
  resolvePool,
  requirePoolMember,
  broadcastMemberJoined,
  broadcastMemberLeft,
  sendMatchedToGroup,
} from "./pool_broadcast.js";

export function handlePoolEnter(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const payload = frame.payload as {
    pool?: string;
    create?: boolean;
    mode?: PoolMode;
    groupSize?: number;
    role?: string;
    attributes?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  } | undefined;

  const poolName = payload?.pool;
  if (!poolName) {
    client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_NOT_FOUND));
    return;
  }

  let pool = hub.getPool(poolName);
  if (!pool) {
    if (!(payload.create ?? false)) {
      client.sendFrame(createErrorFrame(hub.idGen, frame.id, ERR_POOL_NOT_FOUND));
      return;
    }
    pool = hub.getOrCreatePool(poolName, payload.mode ?? "auto", payload.groupSize ?? 2);
  }

  const attributes = payload.attributes ?? {};
  pool.addMember(client.id, payload.role ?? "member", attributes, payload.filter);
  client.pools.add(pool.name);

  const enteredPayload: Record<string, unknown> = {
    pool: pool.name,
    mode: pool.mode,
    groupSize: pool.groupSize,
  };
  if (pool.isClaimBased()) {
    enteredPayload.members = pool.getMemberList(client.id);
  }

  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "pool.entered",
    replyTo: frame.id,
    payload: enteredPayload,
  });

  broadcastMemberJoined(hub, pool, client.id, attributes);

  if (pool.mode === "auto") {
    const result = pool.tryAutoMatch(hub.idGen);
    if (result) sendMatchedToGroup(hub, result, pool.name);
  }
}

export function handlePoolLeave(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const pool = resolvePool(hub, client, frame);
  if (!pool) return;
  if (!requirePoolMember(pool, hub, client, frame)) return;

  broadcastMemberLeft(hub, pool, client.id, "left");
  pool.removeMember(client.id);
  client.pools.delete(pool.name);

  if (pool.isEmpty) hub.removePool(pool.name);
}
