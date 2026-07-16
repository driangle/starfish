import { afterEach } from "vitest";
import { StarfishTestClient } from "./client.js";

export function usePoolClients() {
  const clients: StarfishTestClient[] = [];

  const track = async () => {
    const c = await StarfishTestClient.connect();
    clients.push(c);
    return c;
  };

  const authed = async () => {
    const c = await track();
    await c.hello();
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    clients.length = 0;
  });

  return { track, authed };
}
