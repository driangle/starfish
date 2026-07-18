import { describe, it, expect, beforeEach } from "vitest";
import { validateFrame } from "./client.js";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient } from "./test-helpers.js";

// --- validateFrame tests ---

describe("validateFrame", () => {
  it("rejects invalid JSON", () => {
    const result = validateFrame("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing header", () => {
    const result = validateFrame(JSON.stringify({ id: "m1", resource: "heartbeat", method: "ping", kind: "request" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects header that is not an object", () => {
    const result = validateFrame(
      JSON.stringify({ header: "not-an-object" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing id in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { resource: "heartbeat", method: "ping", kind: "request" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects empty id in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { id: "", resource: "heartbeat", method: "ping", kind: "request" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing resource in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { id: "m1", method: "ping", kind: "request" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects empty resource in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { id: "m1", resource: "", method: "ping", kind: "request" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing method in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { id: "m1", resource: "heartbeat", kind: "request" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing kind in header", () => {
    const result = validateFrame(
      JSON.stringify({ header: { id: "m1", resource: "heartbeat", method: "ping" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("accepts valid frame", () => {
    const result = validateFrame(
      JSON.stringify({
        header: { id: "m1", resource: "heartbeat", method: "ping", kind: "request" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.frame.header.id).toBe("m1");
      expect(result.frame.header.resource).toBe("heartbeat");
      expect(result.frame.header.method).toBe("ping");
      expect(result.frame.header.kind).toBe("request");
    }
  });
});

// --- Handler dispatch tests ---

describe("Handler", () => {
  let hub: StarfishServer;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
  });

  it("rejects unknown message type", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "unknown", method: "type", kind: "request" },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("unknown");
    expect(client.sent[0].header.method).toBe("type");
    expect(client.sent[0].header.kind).toBe("response");
    expect((client.sent[0].payload as any)?.status).toBe("error");
    expect((client.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
    expect(client.sent[0].header.replyTo).toBe("m1");
  });

  it("auth guard rejects unauthenticated client", () => {
    hub.handler.registerAuth("test/guarded", () => {});

    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "test", method: "guarded", kind: "request" },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.kind).toBe("response");
    expect((client.sent[0].payload as any)?.status).toBe("error");
    expect((client.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });

  it("auth guard allows authenticated client", () => {
    let called = false;
    hub.handler.registerAuth("test/guarded", () => {
      called = true;
    });

    client.authenticated = true;
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "test", method: "guarded", kind: "request" },
    });

    expect(called).toBe(true);
    expect(client.sent).toHaveLength(0);
  });
});

// --- client.hello tests ---

describe("client.hello handler", () => {
  let hub: StarfishServer;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
  });

  it("produces welcome response with unique clientId", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: { versions: [2], client: { name: "Alice" } },
    });

    expect(client.authenticated).toBe(true);
    expect(client.id).toMatch(/^client_/);

    expect(client.sent).toHaveLength(1);
    const welcome = client.sent[0];
    expect(welcome.header.resource).toBe("client");
    expect(welcome.header.method).toBe("welcome");
    expect(welcome.header.kind).toBe("response");
    expect(welcome.header.replyTo).toBe("m1");
    expect(welcome.header.ts).toBeTypeOf("number");

    const payload = welcome.payload as Record<string, unknown>;
    expect(payload.clientId).toBe(client.id);
    expect(payload.resumeToken).toMatch(/^rt_/);
    expect(payload.serverTime).toBeTypeOf("number");
    expect(payload.heartbeatInterval).toBe(hub.config.heartbeatIntervalMs);
    expect(payload.sessionRequired).toBe(true);
  });

  it("sets client identity from payload", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: {
        versions: [2],
        client: { name: "Bob", role: "editor", meta: { color: "blue" } },
        capabilities: { rtc: true },
      },
    });

    expect(client.name).toBe("Bob");
    expect(client.role).toBe("editor");
    expect(client.meta).toEqual({ color: "blue" });
    expect(client.rtcCapable).toBe(true);
  });

  it("works with minimal payload", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: { versions: [2] },
    });

    expect(client.authenticated).toBe(true);
    expect(client.id).toMatch(/^client_/);
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("client");
    expect(client.sent[0].header.method).toBe("welcome");
    expect(client.sent[0].header.kind).toBe("response");
  });

  it("registers client in hub", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: { versions: [2] },
    });

    expect(hub.getClient(client.id)).toBe(client);
  });

  it("includes ICE servers in welcome when configured", () => {
    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: { versions: [2] },
    });

    const payload = client.sent[0].payload as Record<string, unknown>;
    const rtc = payload.rtc as { iceServers: Array<{ urls: string }> };
    expect(rtc.iceServers).toHaveLength(1);
    expect(rtc.iceServers[0].urls).toBe("stun:stun.l.google.com:19302");
  });
});

// --- ping tests ---

describe("ping handler", () => {
  it("responds with pong", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "heartbeat", method: "ping", kind: "request" },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("heartbeat");
    expect(client.sent[0].header.method).toBe("pong");
    expect(client.sent[0].header.kind).toBe("response");
    expect(client.sent[0].header.replyTo).toBe("m1");
    expect(client.sent[0].header.ts).toBeTypeOf("number");
  });
});

// --- from field overwrite tests ---

describe("from field overwrite", () => {
  it("overwrites from field on outbound frames after hello", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    hub.handler.dispatch(client, {
      header: { id: "m1", resource: "client", method: "hello", kind: "request" },
      payload: { versions: [2] },
    });

    const welcomeFrame = client.sent[0];
    expect(welcomeFrame.header.from).toBe(client.id);
  });
});
