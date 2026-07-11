import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { parseTo } from "./types.js";
import { createErrorFrame, ERR_PROTOCOL_INVALID_FRAME } from "./errors.js";

export function handleClockSync(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
): void {
  const now = Date.now();
  client.sendFrame({
    v: 1,
    id: hub.idGen.messageId(),
    type: "clock.synced",
    ts: now,
    replyTo: frame.id,
    payload: { serverTime: now },
  });
}

export function handleAck(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
): void {
  routeReply(hub, client, frame);
}

export function handleNack(
  hub: Hub,
  client: Client,
  frame: StarfishFrame,
): void {
  routeReply(hub, client, frame);
}

function routeReply(hub: Hub, client: Client, frame: StarfishFrame): void {
  if (!frame.replyTo) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_PROTOCOL_INVALID_FRAME),
    );
    return;
  }

  frame.from = client.id;
  const targets = parseTo(frame.to);
  if (targets.length === 0) return;

  for (const targetId of targets) {
    const target = hub.getClient(targetId);
    if (target) target.sendFrame(frame);
  }
}
