import type { StarfishFrame } from "./types.js";
import { parseTo, includeSelf } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createErrorFrame, ERR_CLIENT_NOT_FOUND } from "./errors.js";

export function handleClientSend(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const session = hub.getSession(frame.header.session!)!;
  const targets = parseTo(frame.header.to);

  for (const targetId of targets) {
    const target = session.getClient(targetId);
    if (!target) {
      client.sendFrame(
        createErrorFrame(hub.idGen, frame.header.id, ERR_CLIENT_NOT_FOUND, "message", "send"),
      );
      continue;
    }
    target.sendFrame({
      header: {
        id: hub.idGen.messageId(),
        resource: "message",
        method: "message",
        kind: "event",
        session: frame.header.session,
        from: client.id,
        to: targetId,
      },
      payload: frame.payload,
    });
  }
}

export function handleSessionBroadcast(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const session = hub.getSession(frame.header.session!)!;
  const excludeId = includeSelf(frame) ? undefined : client.id;

  session.broadcast(
    {
      header: {
        id: hub.idGen.messageId(),
        resource: "session",
        method: "broadcast",
        kind: "event",
        session: frame.header.session,
        from: client.id,
      },
      payload: frame.payload,
    },
    excludeId,
  );
}
