import type WebSocket from "ws";
import type { StarfishFrame } from "./types.js";
import type { StarfishServer } from "./starfish_server.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
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
  const header = obj.header as Record<string, unknown> | undefined;

  if (!header || typeof header !== "object") {
    return { ok: false, errorCode: ERR_PROTOCOL_INVALID_FRAME, replyTo: "" };
  }

  const id = typeof header.id === "string" ? header.id : "";

  if (
    !id ||
    typeof header.resource !== "string" || header.resource === "" ||
    typeof header.method !== "string" || header.method === "" ||
    typeof header.kind !== "string" || header.kind === ""
  ) {
    return { ok: false, errorCode: ERR_PROTOCOL_INVALID_FRAME, replyTo: id };
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
  pools = new Set<string>();
  topics = new Map<string, Set<string>>();

  private ws: WebSocket;
  private hub: StarfishServer;
  private sendQueue: string[] = [];
  private closed = false;

  constructor(hub: StarfishServer, ws: WebSocket) {
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
    if (this.id && !frame.header.from) {
      frame.header.from = this.id;
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
