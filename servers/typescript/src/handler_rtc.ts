import type { StarfishFrame } from "./types.js";
import { parseTo } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import {
  createErrorFrame,
  ERR_PROTOCOL_INVALID_FRAME,
  ERR_SESSION_NOT_FOUND,
  ERR_CLIENT_NOT_FOUND,
} from "./errors.js";

export function handleRTCConnect(hub: Hub, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCOffer(hub: Hub, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCAnswer(hub: Hub, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

export function handleRTCIce(hub: Hub, client: Client, frame: StarfishFrame): void {
  relayRTC(hub, client, frame);
}

function relayRTC(hub: Hub, client: Client, frame: StarfishFrame): void {
  const targets = parseTo(frame.to);
  if (targets.length !== 1) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_PROTOCOL_INVALID_FRAME),
    );
    return;
  }

  const targetId = targets[0];

  const session = hub.getSession(frame.session!);
  if (!session) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_SESSION_NOT_FOUND),
    );
    return;
  }

  const target = session.getClient(targetId);
  if (!target) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_CLIENT_NOT_FOUND),
    );
    return;
  }

  target.sendFrame({
    v: 1,
    id: frame.id,
    type: frame.type,
    session: frame.session,
    from: client.id,
    to: targetId,
    payload: frame.payload,
  });
}
