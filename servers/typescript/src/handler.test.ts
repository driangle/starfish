import { describe, it, expect, beforeEach } from "vitest";
import { validateFrame } from "./client.js";
import { Handler } from "./handler.js";
import { IDGenerator } from "./id.js";
import { defaultConfig } from "./config.js";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";

function createTestHub(): Hub {
  const config = defaultConfig();
  const idGen = new IDGenerator();
  const clients = new Map<string, Client>();

  const hub = {
    config,
    idGen,
    handler: null as unknown as Handler,
    registerClient(c: Client) {
      clients.set(c.id, c);
    },
    removeClient(c: Client) {
      clients.delete(c.id);
    },
    getClient(id: string) {
      return clients.get(id);
    },
  } as unknown as Hub;

  hub.handler = new Handler(hub);
  return hub;
}

function createTestClient(hub: Hub): Client & { sent: StarfishFrame[] } {
  const sent: StarfishFrame[] = [];
  const client = {
    id: "",
    name: "",
    role: "",
    meta: undefined as unknown,
    rtcCapable: false,
    authenticated: false,
    lastActivity: Date.now(),
    sent,
    sendFrame(frame: StarfishFrame) {
      if (this.id) {
        frame.from = this.id;
      }
      sent.push(structuredClone(frame));
    },
    close() {},
  } as unknown as Client & { sent: StarfishFrame[] };
  return client;
}

// --- validateFrame tests ---

describe("validateFrame", () => {
  it("rejects invalid JSON", () => {
    const result = validateFrame("not json");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing v field", () => {
    const result = validateFrame(JSON.stringify({ id: "m1", type: "ping" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.unsupported_version");
    }
  });

  it("rejects wrong v field", () => {
    const result = validateFrame(
      JSON.stringify({ v: 2, id: "m1", type: "ping" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.unsupported_version");
      expect(result.replyTo).toBe("m1");
    }
  });

  it("rejects missing id", () => {
    const result = validateFrame(JSON.stringify({ v: 1, type: "ping" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects empty id", () => {
    const result = validateFrame(
      JSON.stringify({ v: 1, id: "", type: "ping" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects missing type", () => {
    const result = validateFrame(JSON.stringify({ v: 1, id: "m1" }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("rejects empty type", () => {
    const result = validateFrame(
      JSON.stringify({ v: 1, id: "m1", type: "" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorCode).toBe("protocol.invalid_frame");
    }
  });

  it("accepts valid frame", () => {
    const result = validateFrame(
      JSON.stringify({ v: 1, id: "m1", type: "ping" }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.frame.v).toBe(1);
      expect(result.frame.id).toBe("m1");
      expect(result.frame.type).toBe("ping");
    }
  });
});

// --- Handler dispatch tests ---

describe("Handler", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
  });

  it("rejects unknown message type", () => {
    hub.handler.dispatch(client, { v: 1, id: "m1", type: "unknown.type" });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("protocol.invalid_frame");
    expect(client.sent[0].replyTo).toBe("m1");
  });

  it("auth guard rejects unauthenticated client", () => {
    // Register a handler that requires auth
    hub.handler.registerAuth("test.guarded", () => {});

    hub.handler.dispatch(client, { v: 1, id: "m1", type: "test.guarded" });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("auth.required");
  });

  it("auth guard allows authenticated client", () => {
    let called = false;
    hub.handler.registerAuth("test.guarded", () => {
      called = true;
    });

    client.authenticated = true;
    hub.handler.dispatch(client, { v: 1, id: "m1", type: "test.guarded" });

    expect(called).toBe(true);
    expect(client.sent).toHaveLength(0);
  });
});

// --- client.hello tests ---

describe("client.hello handler", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
  });

  it("produces server.welcome with unique clientId", () => {
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: { client: { name: "Alice" } },
    });

    expect(client.authenticated).toBe(true);
    expect(client.id).toMatch(/^client_/);

    expect(client.sent).toHaveLength(1);
    const welcome = client.sent[0];
    expect(welcome.type).toBe("server.welcome");
    expect(welcome.replyTo).toBe("m1");
    expect(welcome.ts).toBeTypeOf("number");

    const payload = welcome.payload as Record<string, unknown>;
    expect(payload.clientId).toBe(client.id);
    expect(payload.resumeToken).toMatch(/^rt_/);
    expect(payload.serverTime).toBeTypeOf("number");
    expect(payload.heartbeatInterval).toBe(hub.config.heartbeatIntervalMs);
    expect(payload.sessionRequired).toBe(true);
  });

  it("sets client identity from payload", () => {
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: {
        client: { name: "Bob", role: "editor", meta: { color: "blue" } },
        capabilities: { rtc: true },
      },
    });

    expect(client.name).toBe("Bob");
    expect(client.role).toBe("editor");
    expect(client.meta).toEqual({ color: "blue" });
    expect(client.rtcCapable).toBe(true);
  });

  it("works with empty payload", () => {
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
    });

    expect(client.authenticated).toBe(true);
    expect(client.id).toMatch(/^client_/);
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("server.welcome");
  });

  it("registers client in hub", () => {
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: {},
    });

    expect(hub.getClient(client.id)).toBe(client);
  });

  it("includes ICE servers in welcome when configured", () => {
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: {},
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

    hub.handler.dispatch(client, { v: 1, id: "m1", type: "ping" });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("pong");
    expect(client.sent[0].replyTo).toBe("m1");
    expect(client.sent[0].ts).toBeTypeOf("number");
  });
});

// --- from field overwrite tests ---

describe("from field overwrite", () => {
  it("overwrites from field on outbound frames after hello", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    // Complete handshake
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: {},
    });

    const welcomeFrame = client.sent[0];
    expect(welcomeFrame.from).toBe(client.id);
  });
});
