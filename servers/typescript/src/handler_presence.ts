import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createErrorFrame, ERR_PAYLOAD_TOO_LARGE } from "./errors.js";
import { MAX_PRESENCE_SIZE } from "./limits.js";

export function handlePresenceSet(hub: StarfishServer, client: Client, frame: StarfishFrame): void {
  const payloadSize = JSON.stringify(frame.payload ?? null).length;
  if (payloadSize > MAX_PRESENCE_SIZE) {
    client.sendFrame(
      createErrorFrame(hub.idGen, frame.id, ERR_PAYLOAD_TOO_LARGE),
    );
    return;
  }

  const session = hub.getSession(frame.session!)!;
  session.setPresence(client.id, frame.payload);
}
