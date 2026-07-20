import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient, StarfishFrame } from "../src/index.js";

describe("SDK: resume / reconnection", () => {
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

  it("preserves clientId across disconnect and reconnect", async () => {
    const client = track("resumer");
    await client.connect();
    const originalId = client.clientId;
    expect(originalId).toBeDefined();

    await client.disconnect();
    await client.connect();

    // Resuming with the stored token restores the same clientId; a fresh
    // connection would have been assigned a brand-new one.
    expect(client.clientId).toBe(originalId);
    expect(client.connection$.value).toBe("connected");
  });

  it("restores session membership after resume", async () => {
    const session = uniqueSession();

    const client1 = track("member1");
    await client1.connect();
    await client1.join(session);
    const originalId = client1.clientId;

    const client2 = track("member2");
    await client2.connect();
    await client2.join(session);

    // client1 drops and resumes with its token.
    await client1.disconnect();
    await client1.connect();
    expect(client1.clientId).toBe(originalId);

    // Membership is restored server-side: a broadcast from client2 still
    // reaches the resumed client1.
    const received = new Promise<StarfishFrame>((resolve) => {
      client1.on((frame) => {
        if (frame.header.resource === "session" && frame.header.method === "broadcast")
          resolve(frame);
      });
    });

    client2.broadcast({ ping: "after-resume" });

    const message = await received;
    expect(message.header.from).toBe(client2.clientId);
    expect(message.payload).toEqual({ ping: "after-resume" });
  });

  it("falls back to a fresh session on an invalid resume token", async () => {
    const client = track("bad-resume");
    await client.connect();
    const originalId = client.clientId;

    await client.disconnect();

    // Corrupt the stored resume token so the server cannot restore the client.
    // The token is intentionally not part of the public API, so reach into the
    // connection directly to simulate an expired/invalid token.
    (client as any).connection.resumeToken = "invalid-token-xyz";
    await client.connect();

    expect(client.connection$.value).toBe("connected");
    expect(client.clientId).not.toBe(originalId);
  });
});
