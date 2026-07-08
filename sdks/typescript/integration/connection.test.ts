import { describe, it, expect, afterEach } from "vitest";
import { createClient } from "./setup.js";
import type { StarfishClient } from "../src/index.js";

describe("SDK: connection", () => {
  const clients: StarfishClient[] = [];
  const track = (name?: string) => {
    const c = createClient(name);
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.disconnect()));
    clients.length = 0;
  });

  it("connect() completes handshake and sets clientId", async () => {
    const client = track("conn-test");
    await client.connect();

    expect(client.clientId).toBeDefined();
    expect(typeof client.clientId).toBe("string");
    expect(client.connection$.value).toBe("connected");
  });

  it("disconnect() transitions to disconnected state", async () => {
    const client = track("disc-test");
    await client.connect();
    expect(client.connection$.value).toBe("connected");

    await client.disconnect();
    expect(client.connection$.value).toBe("disconnected");
  });

  it("clock.sync() estimates server time offset", async () => {
    const client = track("clock-test");
    await client.connect();

    const offset = await client.clock.sync(3);
    expect(typeof offset).toBe("number");
    // Offset should be reasonable (within 5 seconds of zero for local server)
    expect(Math.abs(offset)).toBeLessThan(5000);
  });
});
