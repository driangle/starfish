import type WebSocket from "ws";
import type { StarfishFrame } from "./types.js";
import type { Hub } from "./hub.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_PROTOCOL_UNSUPPORTED_VERSION,
} from "./errors.js";

export type ClientInfo = {
  id: string;
  name?: string;
  role?: string;
  meta?: unknown;
};

const MAX_SEND_QUEUE = 256;

export type FrameValidation =
  | { ok: true; frame: StarfishFrame }
  | { ok: false; errorCode: string; replyTo: string };

export function validateFrame(raw: string): FrameValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errorCode: ERR_PROTOCOL_INVALID_FRAME, replyTo: "" };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.v !== 1) {
    return {
      ok: false,
      errorCode: ERR_PROTOCOL_UNSUPPORTED_VERSION,
      replyTo: typeof obj.id === "string" ? obj.id : "",
    };
  }

  if (typeof obj.id !== "string" || obj.id === "" || typeof obj.type !== "string" || obj.type === "") {
    return {
      ok: false,
      errorCode: ERR_PROTOCOL_INVALID_FRAME,
      replyTo: typeof obj.id === "string" ? obj.id : "",
    };
  }

  return { ok: true, frame: parsed as StarfishFrame };
}

export class Client {
  id = "";
  name = "";
  role = "";
  meta: unknown = undefined;
  rtcCapable = false;
  authenticated = false;
  lastActivity = Date.now();
  sessions = new Set<string>();

  private ws: WebSocket;
  private hub: Hub;
  private sendQueue: string[] = [];
  private closed = false;

  constructor(hub: Hub, ws: WebSocket) {
    this.hub = hub;
    this.ws = ws;
  }

  start(): void {
    this.ws.on("message", (data: Buffer) => this.onMessage(data));
    this.ws.on("close", () => this.onClose());
    this.ws.on("error", () => this.onClose());
  }

  sendFrame(frame: StarfishFrame): void {
    if (this.closed) return;
    if (this.id) {
      frame.from = this.id;
    }
    const data = JSON.stringify(frame);
    if (this.sendQueue.length >= MAX_SEND_QUEUE) {
      return;
    }
    this.sendQueue.push(data);
    this.drain();
  }

  info(): ClientInfo {
    const ci: ClientInfo = { id: this.id };
    if (this.name) ci.name = this.name;
    if (this.role) ci.role = this.role;
    if (this.meta !== undefined) ci.meta = this.meta;
    return ci;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.ws.close();
  }

  private drain(): void {
    while (this.sendQueue.length > 0) {
      const msg = this.sendQueue.shift()!;
      if (this.ws.readyState === this.ws.OPEN) {
        this.ws.send(msg);
      }
    }
  }

  private onMessage(data: Buffer): void {
    this.lastActivity = Date.now();

    const result = validateFrame(data.toString());
    if (!result.ok) {
      this.sendFrame(
        createErrorFrame(this.hub.idGen, result.replyTo, result.errorCode),
      );
      return;
    }

    this.hub.handler.dispatch(this, result.frame);
  }

  private onClose(): void {
    if (this.closed) return;
    this.closed = true;
    this.hub.handleClientDisconnect(this);
    this.hub.removeClient(this);
  }
}
