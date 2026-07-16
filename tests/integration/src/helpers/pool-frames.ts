import type { StarfishFrame } from "./types.js";
import { uniqueId } from "./setup.js";

export function poolEnterFrame(
  pool: string,
  opts?: {
    create?: boolean;
    mode?: "auto" | "claim" | "mutual" | "propose" | "delegated";
    groupSize?: number;
    role?: "member" | "matchmaker";
    attributes?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  },
): StarfishFrame {
  const payload: any = { pool };
  if (opts?.create !== undefined) payload.create = opts.create;
  if (opts?.mode !== undefined) payload.mode = opts.mode;
  if (opts?.groupSize !== undefined) payload.groupSize = opts.groupSize;
  if (opts?.role !== undefined) payload.role = opts.role;
  if (opts?.attributes !== undefined) payload.attributes = opts.attributes;
  if (opts?.filter !== undefined) payload.filter = opts.filter;
  return { v: 1, id: uniqueId("pool_enter"), type: "pool.enter", payload };
}

export function poolLeaveFrame(pool: string): StarfishFrame {
  return { v: 1, id: uniqueId("pool_leave"), type: "pool.leave", payload: { pool } };
}

export function poolClaimFrame(pool: string, target: string): StarfishFrame {
  return { v: 1, id: uniqueId("pool_claim"), type: "pool.claim", payload: { pool, target } };
}

export function poolAcceptFrame(pool: string, from: string): StarfishFrame {
  return { v: 1, id: uniqueId("pool_accept"), type: "pool.accept", payload: { pool, from } };
}

export function poolRejectFrame(pool: string, from: string): StarfishFrame {
  return { v: 1, id: uniqueId("pool_reject"), type: "pool.reject", payload: { pool, from } };
}

export function poolAssignFrame(pool: string, groups: string[][]): StarfishFrame {
  return { v: 1, id: uniqueId("pool_assign"), type: "pool.assign", payload: { pool, groups } };
}
