import type { StarfishFrame } from "./types.js";
import { parseTo } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_SESSION_NOT_FOUND,
  ERR_CLIENT_NOT_FOUND,
} from "./errors.js";

export function handleRTCConnect(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCOffer(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCAnswer(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCIce(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

function relayRTC(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const targets = parseTo(frame.header.to);
  if (targets.length !== 1) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, "rtc", frame.header.method),
    );
    return;
  }

  const targetId = targets[0];

  const session = hub.getSession(frame.header.session!);
  if (!session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_SESSION_NOT_FOUND, "rtc", frame.header.method),
    );
    return;
  }

  const target = session.getClient(targetId);
  if (!target) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_CLIENT_NOT_FOUND, "rtc", frame.header.method),
    );
    return;
  }

  target.sendFrame({
    header: {
      id: frame.header.id,
      resource: "rtc",
      method: frame.header.method,
      kind: "event",
      session: frame.header.session,
      from: client.id,
      to: targetId,
    },
    payload: frame.payload,
  });
}
