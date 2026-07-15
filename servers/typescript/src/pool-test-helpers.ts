import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";

export function enterPool(
  hub: StarfishServer,
  client: Client & { sent: StarfishFrame[] },
  opts: {
    pool: string;
    create?: boolean;
    mode?: string;
    groupSize?: number;
    role?: string;
    attributes?: Record<string, unknown>;
    filter?: Record<string, unknown>;
  },
): void {
  hub.handler.dispatch(client, {
    v: 1,
    id: `enter-${opts.pool}`,
    type: "pool.enter",
    payload: opts,
  });
}

export function findFrames(client: { sent: StarfishFrame[] }, type: string): StarfishFrame[] {
  return client.sent.filter((f) => f.type === type);
}
