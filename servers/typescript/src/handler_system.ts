import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { parseTo } from "./types.js";
import { createErrorFrame, ERR_PROTOCOL_INVALID_FRAME } from "./errors.js";

export function handleClockSync(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
): void {
  const now = Date.now();
  client.sendFrame({
    header: {
      id: hub.idGen.messageId(),
      resource: "clock",
      method: "sync",
      kind: "response",
      replyTo: frame.header.id,
    },
    payload: { status: "ok", serverTime: now },
  });
}

export function handleAck(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
): void {
  routeReply(hub, client, frame);
}

export function handleNack(
  hub: StarfishServer,
  client: Client,
  frame: StarfishFrame,
): void {
  routeReply(hub, client, frame);
}

function routeReply(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  if (!frame.header.replyTo) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.header.id, ERR_PROTOCOL_INVALID_FRAME, frame.header.resource, frame.header.method),
    );
    return;
  }

  frame.header.from = client.id;
  const targets = parseTo(frame.header.to);
  if (targets.length === 0) return;

  for (const targetId of targets) {
    const target = hub.getClient(targetId);
    if (target) target.sendFrame(frame);
  }
}
