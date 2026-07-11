import type { StarfishFrame, FrameOptions } from "./types.js";
import { uniqueId } from "./setup.js";

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
    payload.client = {
      name: opts?.name ?? "test-client",
      role: opts?.role ?? "test",
      meta: {},
    };
    payload.capabilities = { rtc: false };
    payload.auth = { type: "none" };
  }

  return {
    v: 1,
    id: uniqueId("hello"),
    type: "client.hello",
    ts: Date.now(),
    payload,
  };
}

export function joinFrame(
  session: string,
  opts?: {
    create?: boolean;
    name?: string;
    role?: string;
    meta?: Record<string, any>;
  },
): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("join"),
    type: "session.join",
    session,
    payload: {
      create: opts?.create ?? true,
      name: opts?.name ?? "test-client",
      role: opts?.role ?? "test",
      meta: opts?.meta ?? {},
    },
  };
}

export function leaveFrame(session: string): StarfishFrame {
  return { v: 1, id: uniqueId("leave"), type: "session.leave", session };
}

export function subscribeFrame(session: string, topic: string): StarfishFrame {
  return { v: 1, id: uniqueId("sub"), type: "topic.subscribe", session, topic };
}

export function unsubscribeFrame(session: string, topic: string): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("unsub"),
    type: "topic.unsubscribe",
    session,
    topic,
  };
}

export function publishFrame(
  session: string,
  topic: string,
  payload: any,
  options?: FrameOptions,
): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("pub"),
    type: "topic.publish",
    session,
    topic,
    payload,
    ...(options && { options }),
  };
}

export function directSendFrame(
  session: string,
  to: string | string[],
  payload: any,
): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("send"),
    type: "client.send",
    session,
    to,
    payload,
  };
}

export function broadcastFrame(
  session: string,
  payload: any,
  opts?: { includeSelf?: boolean },
): StarfishFrame {
  const frame: StarfishFrame = {
    v: 1,
    id: uniqueId("bcast"),
    type: "session.broadcast",
    session,
    payload,
  };
  if (opts?.includeSelf) {
    frame.options = { delivery: { includeSelf: true } };
  }
  return frame;
}

export function presenceFrame(session: string, payload: any): StarfishFrame {
  return { v: 1, id: uniqueId("pres"), type: "presence.set", session, payload };
}

export function dataSaveFrame(
  session: string,
  key: string,
  opts: {
    scope: "self" | "session";
    op: string;
    data?: any;
    expectedVersion?: number;
  },
): StarfishFrame {
  const payload: any = { key, scope: opts.scope, op: opts.op };
  if (opts.data !== undefined) payload.data = opts.data;
  if (opts.expectedVersion !== undefined) payload.expectedVersion = opts.expectedVersion;
  return { v: 1, id: uniqueId("dsave"), type: "data.save", session, payload };
}

export function dataGetFrame(
  session: string,
  key: string,
  scope: "self" | "session",
): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("dget"),
    type: "data.get",
    session,
    payload: { key, scope },
  };
}

export function pingFrame(): StarfishFrame {
  return { v: 1, id: uniqueId("ping"), type: "ping", ts: Date.now() };
}

export function clockSyncFrame(): StarfishFrame {
  return { v: 1, id: uniqueId("clock"), type: "clock.sync", ts: Date.now() };
}

export function rtcOfferFrame(session: string, to: string, sdp: string): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("rtc_offer"),
    type: "rtc.offer",
    session,
    to,
    payload: { sdp },
  };
}

export function rtcAnswerFrame(session: string, to: string, sdp: string): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("rtc_answer"),
    type: "rtc.answer",
    session,
    to,
    payload: { sdp },
  };
}

export function rtcIceFrame(session: string, to: string, candidate: any): StarfishFrame {
  return {
    v: 1,
    id: uniqueId("rtc_ice"),
    type: "rtc.ice",
    session,
    to,
    payload: { candidate },
  };
}
