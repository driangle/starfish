import type { StarfishFrame, StarfishHeader, DeliveryOptions } from "./types.js";
import { uniqueId } from "./setup.js";

function request(
  prefix: string,
  resource: string,
  method: string,
  extra?: Partial<StarfishHeader>,
): StarfishHeader {
  return { id: uniqueId(prefix), resource, method, kind: "request", ...extra };
}

export function helloFrame(opts?: {
  name?: string;
  role?: string;
  resumeToken?: string;
}): StarfishFrame {
  const payload: any = {};
  if (opts?.resumeToken) {
    payload.resumeToken = opts.resumeToken;
    payload.capabilities = { rtc: false };
  } else {
    payload.versions = [2];
    payload.client = {
      name: opts?.name ?? "test-client",
      role: opts?.role ?? "test",
      meta: {},
    };
    payload.capabilities = { rtc: false };
    payload.auth = { type: "none" };
  }
  return { header: { ...request("hello", "client", "hello"), v: 2, ts: Date.now() }, payload };
}

export function joinFrame(
  session: string,
  opts?: { create?: boolean; name?: string; role?: string; meta?: Record<string, any> },
): StarfishFrame {
  return {
    header: request("join", "session", "join", { session }),
    payload: {
      create: opts?.create ?? true,
      name: opts?.name ?? "test-client",
      role: opts?.role ?? "test",
      meta: opts?.meta ?? {},
    },
  };
}

export function leaveFrame(session: string): StarfishFrame {
  return { header: request("leave", "session", "leave", { session }) };
}

export function subscribeFrame(session: string, topic: string): StarfishFrame {
  return { header: request("sub", "topic", "subscribe", { session, topic }) };
}

export function unsubscribeFrame(session: string, topic: string): StarfishFrame {
  return { header: request("unsub", "topic", "unsubscribe", { session, topic }) };
}

export function publishFrame(
  session: string,
  topic: string,
  payload: any,
  opts?: {
    delivery?: DeliveryOptions;
    priority?: "low" | "normal" | "high" | "critical";
    ttl?: number;
  },
): StarfishFrame {
  return {
    header: request("pub", "topic", "publish", {
      session,
      topic,
      ...(opts?.delivery && { delivery: opts.delivery }),
      ...(opts?.priority && { priority: opts.priority }),
      ...(opts?.ttl && { ttl: opts.ttl }),
    }),
    payload,
  };
}

export function directSendFrame(
  session: string,
  to: string | string[],
  payload: any,
): StarfishFrame {
  return { header: request("send", "message", "send", { session, to }), payload };
}

export function broadcastFrame(
  session: string,
  payload: any,
  opts?: { includeSelf?: boolean },
): StarfishFrame {
  return {
    header: request("bcast", "session", "broadcast", {
      session,
      ...(opts?.includeSelf && { delivery: { includeSelf: true } }),
    }),
    payload,
  };
}

export function presenceFrame(session: string, payload: any): StarfishFrame {
  return { header: request("pres", "presence", "set", { session }), payload };
}

export function dataSaveFrame(
  session: string,
  key: string,
  opts: { scope: "self" | "session"; op: string; data?: any; expectedVersion?: number },
): StarfishFrame {
  const payload: any = { key, scope: opts.scope, op: opts.op };
  if (opts.data !== undefined) payload.data = opts.data;
  if (opts.expectedVersion !== undefined) payload.expectedVersion = opts.expectedVersion;
  return { header: request("dsave", "data", "save", { session }), payload };
}

export function dataGetFrame(
  session: string,
  key: string,
  scope: "self" | "session",
): StarfishFrame {
  return { header: request("dget", "data", "get", { session }), payload: { key, scope } };
}

export function pingFrame(): StarfishFrame {
  return { header: request("ping", "heartbeat", "ping", { ts: Date.now() }) };
}

export function clockSyncFrame(): StarfishFrame {
  return { header: request("clock", "clock", "sync", { ts: Date.now() }) };
}

export function rtcOfferFrame(session: string, to: string, sdp: string): StarfishFrame {
  return { header: request("rtc_offer", "rtc", "offer", { session, to }), payload: { sdp } };
}

export function rtcAnswerFrame(session: string, to: string, sdp: string): StarfishFrame {
  return { header: request("rtc_answer", "rtc", "answer", { session, to }), payload: { sdp } };
}

export function rtcIceFrame(session: string, to: string, candidate: any): StarfishFrame {
  return {
    header: request("rtc_ice", "rtc", "ice", { session, to }),
    payload: { candidate },
  };
}
