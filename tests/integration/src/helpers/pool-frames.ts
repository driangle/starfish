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
  return {
    header: {
      id: uniqueId("pool_enter"),
      resource: "pool",
      method: "enter",
      kind: "request",
    },
    payload,
  };
}

export function poolLeaveFrame(pool: string): StarfishFrame {
  return {
    header: {
      id: uniqueId("pool_leave"),
      resource: "pool",
      method: "leave",
      kind: "request",
    },
    payload: { pool },
  };
}

export function poolClaimFrame(pool: string, target: string): StarfishFrame {
  return {
    header: {
      id: uniqueId("pool_claim"),
      resource: "pool",
      method: "claim",
      kind: "request",
    },
    payload: { pool, target },
  };
}

export function poolAcceptFrame(pool: string, from: string): StarfishFrame {
  return {
    header: {
      id: uniqueId("pool_accept"),
      resource: "pool",
      method: "accept",
      kind: "request",
    },
    payload: { pool, from },
  };
}

export function poolRejectFrame(pool: string, from: string): StarfishFrame {
  return {
    header: {
      id: uniqueId("pool_reject"),
      resource: "pool",
      method: "reject",
      kind: "request",
    },
    payload: { pool, from },
  };
}

export function poolAssignFrame(pool: string, groups: string[][]): StarfishFrame {
  return {
    header: {
      id: uniqueId("pool_assign"),
      resource: "pool",
      method: "assign",
      kind: "request",
    },
    payload: { pool, groups },
  };
}
