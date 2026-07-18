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
    header: {
      id: `enter-${opts.pool}`,
      resource: "pool",
      method: "enter",
      kind: "request",
    },
    payload: opts,
  });
}

export function findFrames(client: { sent: StarfishFrame[] }, resource: string, method: string): StarfishFrame[] {
  return client.sent.filter((f) => f.header.resource === resource && f.header.method === method);
}
