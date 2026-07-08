import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { pingFrame, clockSyncFrame, helloFrame } from "./helpers/frames.js";
import { SHORT_TIMEOUT } from "./helpers/setup.js";

describe("connection lifecycle", () => {
  const clients: StarfishTestClient[] = [];
  const track = async (url?: string) => {
    const c = await StarfishTestClient.connect(url);
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    clients.length = 0;
  });

  it("client.hello returns server.welcome with required fields", async () => {
    const client = await track();
    const welcome = await client.hello({ name: "test-conn" });

    expect(welcome.type).toBe("server.welcome");
    expect(welcome.v).toBe(1);
    expect(welcome.replyTo).toBeDefined();
    expect(welcome.payload.clientId).toBeDefined();
    expect(typeof welcome.payload.clientId).toBe("string");
    expect(welcome.payload.resumeToken).toBeDefined();
    expect(typeof welcome.payload.resumeToken).toBe("string");
    expect(welcome.payload.serverTime).toBeDefined();
    expect(typeof welcome.payload.serverTime).toBe("number");
    expect(welcome.payload.heartbeatInterval).toBeDefined();
    expect(typeof welcome.payload.heartbeatInterval).toBe("number");
  });

  it("ping returns pong", async () => {
    const client = await track();
    await client.hello();

    const ping = pingFrame();
    await client.send(ping);
    const pong = await client.waitForReply(ping.id);

    expect(pong.type).toBe("pong");
    expect(pong.replyTo).toBe(ping.id);
  });

  it("clock.sync returns clock.synced with serverTime", async () => {
    const client = await track();
    await client.hello();

    const sync = clockSyncFrame();
    await client.send(sync);
    const synced = await client.waitForReply(sync.id);

    expect(synced.type).toBe("clock.synced");
    expect(synced.replyTo).toBe(sync.id);
    expect(synced.payload.serverTime).toBeDefined();
    expect(typeof synced.payload.serverTime).toBe("number");
    expect(synced.payload.serverTime).toBeGreaterThan(0);
  });

  it("resume with valid token preserves clientId", async () => {
    const client1 = await track();
    const welcome1 = await client1.hello({ name: "resumable" });
    const originalClientId = welcome1.payload.clientId;
    const token = welcome1.payload.resumeToken;
    await client1.close();

    // Reconnect immediately with the resume token
    const client2 = await track();
    const welcome2 = await client2.hello({ resumeToken: token });

    expect(welcome2.type).toBe("server.welcome");
    expect(welcome2.payload.clientId).toBe(originalClientId);
    expect(welcome2.payload.resumed).toBe(true);
    // New token should be issued
    expect(welcome2.payload.resumeToken).toBeDefined();
    expect(welcome2.payload.resumeToken).not.toBe(token);
  });

  it("resume with invalid token gives fresh session", async () => {
    const client = await track();
    const welcome = await client.hello({ resumeToken: "invalid_token_123" });

    expect(welcome.type).toBe("server.welcome");
    expect(welcome.payload.clientId).toBeDefined();
    // Should NOT have resumed flag or it should be false
    expect(welcome.payload.resumed).toBeFalsy();
  });

  it("unsupported protocol version returns error", async () => {
    const client = await track();
    const frame = { ...helloFrame(), v: 99 };
    await client.send(frame);

    const response = await client.waitForReply(frame.id);
    expect(response.type).toBe("error");
    expect(response.error?.code).toBe("protocol.unsupported_version");
  });
});
