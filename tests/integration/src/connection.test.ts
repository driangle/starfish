import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { pingFrame, clockSyncFrame, helloFrame } from "./helpers/frames.js";
import { SHORT_TIMEOUT, uniqueId } from "./helpers/setup.js";

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

    expect(welcome.header.resource).toBe("client");
    expect(welcome.header.method).toBe("welcome");
    expect(welcome.header.v).toBe(2);
    expect(welcome.header.replyTo).toBeDefined();
    expect(welcome.payload?.clientId).toBeDefined();
    expect(typeof welcome.payload?.clientId).toBe("string");
    expect(welcome.payload?.resumeToken).toBeDefined();
    expect(typeof welcome.payload?.resumeToken).toBe("string");
    expect(welcome.payload?.serverTime).toBeDefined();
    expect(typeof welcome.payload?.serverTime).toBe("number");
    expect(welcome.payload?.heartbeatInterval).toBeDefined();
    expect(typeof welcome.payload?.heartbeatInterval).toBe("number");
  });

  it("ping returns pong", async () => {
    const client = await track();
    await client.hello();

    const ping = pingFrame();
    await client.send(ping);
    const pong = await client.waitForReply(ping.header.id);

    expect(pong.header.resource).toBe("heartbeat");
    expect(pong.header.method).toBe("pong");
    expect(pong.header.replyTo).toBe(ping.header.id);
  });

  it("clock.sync returns clock.synced with serverTime", async () => {
    const client = await track();
    await client.hello();

    const sync = clockSyncFrame();
    await client.send(sync);
    const synced = await client.waitForReply(sync.header.id);

    expect(synced.header.resource).toBe("clock");
    expect(synced.header.method).toBe("sync");
    expect(synced.header.replyTo).toBe(sync.header.id);
    expect(synced.payload?.serverTime).toBeDefined();
    expect(typeof synced.payload?.serverTime).toBe("number");
    expect(synced.payload?.serverTime).toBeGreaterThan(0);
  });

  it("resume with valid token preserves clientId", async () => {
    const client1 = await track();
    const welcome1 = await client1.hello({ name: "resumable" });
    const originalClientId = welcome1.payload?.clientId;
    const token = welcome1.payload?.resumeToken;
    await client1.close();

    // Reconnect immediately with the resume token
    const client2 = await track();
    const welcome2 = await client2.hello({ resumeToken: token });

    expect(welcome2.header.resource).toBe("client");
    expect(welcome2.header.method).toBe("welcome");
    expect(welcome2.payload?.clientId).toBe(originalClientId);
    expect(welcome2.payload?.resumed).toBe(true);
    // New token should be issued
    expect(welcome2.payload?.resumeToken).toBeDefined();
    expect(welcome2.payload?.resumeToken).not.toBe(token);
  });

  it("resume with invalid token gives fresh session", async () => {
    const client = await track();
    const welcome = await client.hello({ resumeToken: "invalid_token_123" });

    expect(welcome.header.resource).toBe("client");
    expect(welcome.header.method).toBe("welcome");
    expect(welcome.payload?.clientId).toBeDefined();
    // Should NOT have resumed flag or it should be false
    expect(welcome.payload?.resumed).toBeFalsy();
  });

  it("unsupported protocol version returns error", async () => {
    const client = await track();
    // Send a proper v0.2 envelope with unsupported version in payload
    const frame = {
      header: {
        v: 2,
        id: uniqueId("hello"),
        resource: "client",
        method: "hello",
        kind: "request" as const,
        ts: Date.now(),
      },
      payload: {
        versions: [99],
        client: { name: "test", role: "test", meta: {} },
        capabilities: { rtc: false },
        auth: { type: "none" },
      },
    };
    await client.send(frame);

    const response = await client.waitForReply(frame.header.id);
    expect((response.payload as any)?.status).toBe("error");
    expect((response.payload as any)?.error?.code).toBe("protocol.unsupported_version");
  });

  it("version negotiation succeeds when client offers supported version", async () => {
    const client = await track();
    // Client offers versions [1, 2] — server should accept version 2
    const frame = {
      header: {
        v: 2,
        id: uniqueId("hello"),
        resource: "client",
        method: "hello",
        kind: "request" as const,
        ts: Date.now(),
      },
      payload: {
        versions: [1, 2],
        client: { name: "multi-version", role: "test", meta: {} },
        capabilities: { rtc: false },
        auth: { type: "none" },
      },
    };
    await client.send(frame);

    const welcome = await client.waitForReply(frame.header.id);
    expect(welcome.header.resource).toBe("client");
    expect(welcome.header.method).toBe("welcome");
    expect(welcome.payload?.version).toBe(2);
  });

  it("header.meta is accepted without error", async () => {
    const client = await track();
    await client.hello();

    // Send a ping with custom meta — server should process normally
    const frame = {
      header: {
        id: uniqueId("ping"),
        resource: "heartbeat",
        method: "ping",
        kind: "request" as const,
        ts: Date.now(),
        meta: { traceId: "abc-123", debugLevel: 5 },
      },
    };
    await client.send(frame);

    const pong = await client.waitForReply(frame.header.id);
    expect(pong.header.resource).toBe("heartbeat");
    expect(pong.header.method).toBe("pong");
  });
});
