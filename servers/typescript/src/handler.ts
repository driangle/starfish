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
import { handleClockSync, handleAck, handleNack } from "./handler_system.js";
import { handleClientHello } from "./handler_connection.js";

type HandlerFunc = (client: Client, frame: StarfishFrame) => void;

export class Handler {
  private hub: Hub;
  private handlers = new Map<string, HandlerFunc>();

  constructor(hub: Hub) {
    this.hub = hub;

    this.handlers.set("client.hello", (c, f) => handleClientHello(this.hub, c, f));
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
    this.handlers.set(
      "clock.sync",
      (c, f) => handleClockSync(this.hub, c, f),
    );
    this.handlers.set(
      "ack",
      this.requireAuth((c, f) => handleAck(this.hub, c, f)),
    );
    this.handlers.set(
      "nack",
      this.requireAuth((c, f) => handleNack(this.hub, c, f)),
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
