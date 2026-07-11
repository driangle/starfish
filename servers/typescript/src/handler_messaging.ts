import type { StarfishFrame } from "./types.js";
import { parseTo, includeSelf } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createErrorFrame, ERR_CLIENT_NOT_FOUND } from "./errors.js";

export function handleClientSend(hub: Hub, client: Client, frame: StarfishFrame): void {
  const session = hub.getSession(frame.session!)!;
  const targets = parseTo(frame.to);

  for (const targetId of targets) {
    const target = session.getClient(targetId);
    if (!target) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.id, ERR_CLIENT_NOT_FOUND),
      );
      continue;
    }
    target.sendFrame({
      v: 1,
      id: hub.idGen.messageId(),
      type: "client.message",
      session: frame.session,
      from: client.id,
      to: targetId,
      payload: frame.payload,
    });
  }
}

export function handleSessionBroadcast(hub: Hub, client: Client, frame: StarfishFrame): void {
  const session = hub.getSession(frame.session!)!;
  const excludeId = includeSelf(frame) ? undefined : client.id;

  session.broadcast(
    {
      v: 1,
      id: hub.idGen.messageId(),
      type: "session.broadcast",
      session: frame.session,
      from: client.id,
      payload: frame.payload,
    },
    excludeId,
  );
}
