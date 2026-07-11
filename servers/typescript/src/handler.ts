import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createErrorFrame, ERR_AUTH_REQUIRED, ERR_PROTOCOL_INVALID_FRAME } from "./errors.js";
import {
  requireSession,
  handleSessionJoin,
  handleSessionLeave,
} from "./handler_session.js";
import {
  handleTopicSubscribe,
  handleTopicUnsubscribe,
  handleTopicPublish,
} from "./handler_topic.js";
import {
  handleClientSend,
  handleSessionBroadcast,
} from "./handler_messaging.js";
import { handlePresenceSet } from "./handler_presence.js";

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
    this.handlers.set(
      "session.join",
      this.requireAuth((c, f) => handleSessionJoin(this.hub, c, f)),
    );
    this.handlers.set(
      "session.leave",
      this.requireAuth((c, f) => handleSessionLeave(this.hub, c, f)),
    );

    this.handlers.set(
      "topic.subscribe",
      this.requireAuth(this.requireSession((c, f) => handleTopicSubscribe(this.hub, c, f))),
    );
    this.handlers.set(
      "topic.unsubscribe",
      this.requireAuth(this.requireSession((c, f) => handleTopicUnsubscribe(this.hub, c, f))),
    );
    this.handlers.set(
      "topic.publish",
      this.requireAuth(this.requireSession((c, f) => handleTopicPublish(this.hub, c, f))),
    );
    this.handlers.set(
      "client.send",
      this.requireAuth(this.requireSession((c, f) => handleClientSend(this.hub, c, f))),
    );
    this.handlers.set(
      "session.broadcast",
      this.requireAuth(this.requireSession((c, f) => handleSessionBroadcast(this.hub, c, f))),
    );
    this.handlers.set(
      "presence.set",
      this.requireAuth(this.requireSession((c, f) => handlePresenceSet(this.hub, c, f))),
    );
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

  requireSession(fn: HandlerFunc): HandlerFunc {
    return requireSession(this.hub, fn);
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
