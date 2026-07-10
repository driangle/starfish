import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import {
  createErrorFrame,
  ERR_AUTH_REQUIRED,
  ERR_PROTOCOL_INVALID_FRAME,
} from "./errors.js";

type HelloPayload = {
  client?: { name?: string; role?: string; meta?: unknown };
  capabilities?: { rtc?: boolean };
  resumeToken?: string;
};

type WelcomePayload = {
  clientId: string;
  resumeToken: string;
  resumeTimeout: number;
  serverTime: number;
  heartbeatInterval: number;
  sessionRequired: boolean;
  rtc?: { iceServers: Array<{ urls: string }> };
};

type HandlerFunc = (client: Client, frame: StarfishFrame) => void;

export class Handler {
  private hub: Hub;
  private handlers = new Map<string, HandlerFunc>();

  constructor(hub: Hub) {
    this.hub = hub;

    this.handlers.set("client.hello", (c, f) => this.handleClientHello(c, f));
    this.handlers.set("ping", (c, f) => this.handlePing(c, f));
  }

  dispatch(client: Client, frame: StarfishFrame): void {
    const handler = this.handlers.get(frame.type);
    if (!handler) {
      client.sendFrame(
        createErrorFrame(this.hub.idGen, frame.id, ERR_PROTOCOL_INVALID_FRAME),
      );
      return;
    }
    handler(client, frame);
  }

  private requireAuth(fn: HandlerFunc): HandlerFunc {
    return (client: Client, frame: StarfishFrame) => {
      if (!client.authenticated) {
        client.sendFrame(
          createErrorFrame(this.hub.idGen, frame.id, ERR_AUTH_REQUIRED),
        );
        return;
      }
      fn(client, frame);
    };
  }

  registerAuth(type: string, fn: HandlerFunc): void {
    this.handlers.set(type, this.requireAuth(fn));
  }

  register(type: string, fn: HandlerFunc): void {
    this.handlers.set(type, fn);
  }

  private handleClientHello(client: Client, frame: StarfishFrame): void {
    let payload: HelloPayload = {};
    if (frame.payload !== undefined) {
      payload = frame.payload as HelloPayload;
    }

    const clientId = this.hub.idGen.clientId();
    const resumeToken = this.hub.idGen.resumeToken();
    const now = Date.now();

    client.id = clientId;
    if (payload.client) {
      client.name = payload.client.name ?? "";
      client.role = payload.client.role ?? "";
      client.meta = payload.client.meta;
    }
    if (payload.capabilities) {
      client.rtcCapable = payload.capabilities.rtc === true;
    }
    client.authenticated = true;
    client.lastActivity = now;

    this.hub.registerClient(client);

    const welcome: WelcomePayload = {
      clientId,
      resumeToken,
      resumeTimeout: this.hub.config.resumeTimeoutMs,
      serverTime: now,
      heartbeatInterval: this.hub.config.heartbeatIntervalMs,
      sessionRequired: true,
    };

    if (this.hub.config.iceServers.length > 0) {
      welcome.rtc = { iceServers: this.hub.config.iceServers };
    }

    client.sendFrame({
      v: 1,
      id: this.hub.idGen.messageId(),
      type: "server.welcome",
      ts: now,
      replyTo: frame.id,
      payload: welcome,
    });
  }

  private handlePing(client: Client, frame: StarfishFrame): void {
    client.sendFrame({
      v: 1,
      id: this.hub.idGen.messageId(),
      type: "pong",
      ts: Date.now(),
      replyTo: frame.id,
    });
  }
}
