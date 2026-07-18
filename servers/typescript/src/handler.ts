import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
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
import { handleDataSave, handleDataGet } from "./handler_data.js";
import { handleClockSync, handleAck, handleNack } from "./handler_system.js";
import { handleClientHello } from "./handler_connection.js";
import {
  handleRTCConnect,
  handleRTCOffer,
  handleRTCAnswer,
  handleRTCIce,
} from "./handler_rtc.js";
import { handlePoolEnter, handlePoolLeave } from "./handler_pool.js";
import { handlePoolClaim, handlePoolAccept, handlePoolReject, handlePoolAssign } from "./handler_pool_match.js";

type HandlerFunc = (client: Client, frame: StarfishFrame) => void;

export class Handler {
  private hub: StarfishServer;
  private handlers = new Map<string, HandlerFunc>();

  constructor(hub: StarfishServer) {
    this.hub = hub;

    this.handlers.set("client/hello", (c, f) => handleClientHello(this.hub, c, f));
    this.handlers.set("heartbeat/ping", (c, f) => this.handlePing(c, f));
    this.handlers.set(
      "session/join",
      this.requireAuth((c, f) => handleSessionJoin(this.hub, c, f)),
    );
    this.handlers.set(
      "session/leave",
      this.requireAuth((c, f) => handleSessionLeave(this.hub, c, f)),
    );

    this.handlers.set(
      "topic/subscribe",
      this.requireAuth(this.requireSession((c, f) => handleTopicSubscribe(this.hub, c, f))),
    );
    this.handlers.set(
      "topic/unsubscribe",
      this.requireAuth(this.requireSession((c, f) => handleTopicUnsubscribe(this.hub, c, f))),
    );
    this.handlers.set(
      "topic/publish",
      this.requireAuth(this.requireSession((c, f) => handleTopicPublish(this.hub, c, f))),
    );
    this.handlers.set(
      "message/send",
      this.requireAuth(this.requireSession((c, f) => handleClientSend(this.hub, c, f))),
    );
    this.handlers.set(
      "session/broadcast",
      this.requireAuth(this.requireSession((c, f) => handleSessionBroadcast(this.hub, c, f))),
    );
    this.handlers.set(
      "presence/set",
      this.requireAuth(this.requireSession((c, f) => handlePresenceSet(this.hub, c, f))),
    );
    this.handlers.set(
      "data/save",
      this.requireAuth(this.requireSession((c, f) => handleDataSave(this.hub, c, f))),
    );
    this.handlers.set(
      "data/get",
      this.requireAuth(this.requireSession((c, f) => handleDataGet(this.hub, c, f))),
    );
    this.handlers.set(
      "rtc/connect",
      this.requireAuth(this.requireSession((c, f) => handleRTCConnect(this.hub, c, f))),
    );
    this.handlers.set(
      "rtc/offer",
      this.requireAuth(this.requireSession((c, f) => handleRTCOffer(this.hub, c, f))),
    );
    this.handlers.set(
      "rtc/answer",
      this.requireAuth(this.requireSession((c, f) => handleRTCAnswer(this.hub, c, f))),
    );
    this.handlers.set(
      "rtc/ice",
      this.requireAuth(this.requireSession((c, f) => handleRTCIce(this.hub, c, f))),
    );
    this.handlers.set(
      "pool/enter",
      this.requireAuth((c, f) => handlePoolEnter(this.hub, c, f)),
    );
    this.handlers.set(
      "pool/leave",
      this.requireAuth((c, f) => handlePoolLeave(this.hub, c, f)),
    );
    this.handlers.set(
      "pool/claim",
      this.requireAuth((c, f) => handlePoolClaim(this.hub, c, f)),
    );
    this.handlers.set(
      "pool/accept",
      this.requireAuth((c, f) => handlePoolAccept(this.hub, c, f)),
    );
    this.handlers.set(
      "pool/reject",
      this.requireAuth((c, f) => handlePoolReject(this.hub, c, f)),
    );
    this.handlers.set(
      "pool/assign",
      this.requireAuth((c, f) => handlePoolAssign(this.hub, c, f)),
    );
    this.handlers.set(
      "clock/sync",
      (c, f) => handleClockSync(this.hub, c, f),
    );
    this.handlers.set(
      "ack/ack",
      this.requireAuth((c, f) => handleAck(this.hub, c, f)),
    );
    this.handlers.set(
      "ack/nack",
      this.requireAuth((c, f) => handleNack(this.hub, c, f)),
    );
  }

  dispatch(client: Client, frame: StarfishFrame): void {
    const key = `${frame.header.resource}/${frame.header.method}`;
    const handler = this.handlers.get(key);
    if (!handler) {
      client.sendFrame(
        createErrorFrame(this.hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, frame.header.resource, frame.header.method),
      );
      return;
    }
    handler(client, frame);
  }

  private requireAuth(fn: HandlerFunc): HandlerFunc {
    return (client: Client, frame: StarfishFrame) => {
      if (!client.authenticated) {
        client.sendFrame(
          createErrorFrame(this.hub.idGen, frame.header.id, ERR_AUTH_REQUIRED, frame.header.resource, frame.header.method),
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
      header: {
        id: this.hub.idGen.messageId(),
        resource: "heartbeat",
        method: "pong",
        kind: "response",
        ts: Date.now(),
        replyTo: frame.header.id,
      },
      payload: { status: "ok" },
    });
  }
}
