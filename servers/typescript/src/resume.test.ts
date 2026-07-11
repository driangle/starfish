import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: Hub, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    v: 1, id: "join", type: "session.join",
    session, payload: { create: true },
  });
  client.sent.length = 0;
}

type WelcomePayload = {
  clientId: string;
  resumed?: boolean;
  resumeToken: string;
  sessions?: string[];
};

function getWelcome(client: Client & { sent: StarfishFrame[] }): WelcomePayload {
  const welcome = client.sent.find((f) => f.type === "server.welcome");
  return welcome!.payload as WelcomePayload;
}

describe("resume", () => {
  let hub: Hub;

  beforeEach(() => {
    vi.useFakeTimers();
    hub = createTestHub();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fresh handshake returns a resumeToken", () => {
    const c = createTestClient(hub);
    hub.handler.dispatch(c, {
      v: 1, id: "hello", type: "client.hello", payload: {},
    });

    const welcome = getWelcome(c);
    expect(welcome.resumeToken).toMatch(/^rt_/);
  });

  it("defers client.disconnected broadcast until resume timeout", () => {
    const c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room1");

    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");
    c1.sent.length = 0;

    hub.handleClientDisconnect(c2);

    // Not broadcast immediately
    expect(c1.sent).toHaveLength(0);

    // Broadcast after timeout
    vi.advanceTimersByTime(hub.config.resumeTimeoutMs);

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("client.disconnected");
    expect((c1.sent[0].payload as { reason: string }).reason).toBe("timeout");
  });

  it("successful resume restores session and topic state", () => {
    const c1 = createTestClient(hub);
    hub.handler.dispatch(c1, {
      v: 1, id: "hello", type: "client.hello",
      payload: { client: { name: "alice", role: "editor" } },
    });
    const token = getWelcome(c1).resumeToken;
    const originalId = c1.id;
    c1.sent.length = 0;

    joinSession(hub, c1, "room1");
    hub.handler.dispatch(c1, {
      v: 1, id: "sub", type: "topic.subscribe",
      session: "room1", topic: "cursor",
    });
    c1.sent.length = 0;

    // Disconnect
    hub.handleClientDisconnect(c1);
    hub.removeClient(c1);

    // Resume with new client object
    const c2 = createTestClient(hub);
    hub.handler.dispatch(c2, {
      v: 1, id: "hello2", type: "client.hello",
      payload: { resumeToken: token },
    });

    const welcome = getWelcome(c2);
    expect(welcome.resumed).toBe(true);
    expect(welcome.clientId).toBe(originalId);
    expect(welcome.sessions).toContain("room1");
    expect(c2.id).toBe(originalId);
    expect(c2.name).toBe("alice");
    expect(c2.role).toBe("editor");
    expect(c2.sessions.has("room1")).toBe(true);

    // Should be back in the session
    const sess = hub.getSession("room1");
    expect(sess?.hasClient(c2.id)).toBe(true);
    expect(sess?.isSubscribed("cursor", c2.id)).toBe(true);
  });

  it("resume issues new token and invalidates old", () => {
    const c1 = createTestClient(hub);
    hub.handler.dispatch(c1, {
      v: 1, id: "hello", type: "client.hello", payload: {},
    });
    const oldToken = getWelcome(c1).resumeToken;
    c1.sent.length = 0;

    joinSession(hub, c1, "room1");
    hub.handleClientDisconnect(c1);
    hub.removeClient(c1);

    // Resume
    const c2 = createTestClient(hub);
    hub.handler.dispatch(c2, {
      v: 1, id: "hello2", type: "client.hello",
      payload: { resumeToken: oldToken },
    });
    const newToken = getWelcome(c2).resumeToken;
    expect(newToken).not.toBe(oldToken);

    // Old token should be invalid now — falls through to fresh connection
    const c3 = createTestClient(hub);
    hub.handler.dispatch(c3, {
      v: 1, id: "hello3", type: "client.hello",
      payload: { resumeToken: oldToken },
    });
    expect(c3.sent[0].type).toBe("server.welcome");
    expect(c3.sent[0].payload.resumed).toBeFalsy();
    expect(c3.sent[0].payload.clientId).toBeDefined();
    expect(c3.sent[0].payload.clientId).not.toBe(c2.sent[0].payload.clientId);
  });

  it("invalid token falls through to fresh connection", () => {
    const c = createTestClient(hub);
    hub.handler.dispatch(c, {
      v: 1, id: "hello", type: "client.hello",
      payload: { resumeToken: "rt_bogus" },
    });

    expect(c.sent[0].type).toBe("server.welcome");
    expect(c.sent[0].payload.resumed).toBeFalsy();
    expect(c.sent[0].payload.clientId).toBeDefined();
  });

  it("expired token falls through to fresh connection", () => {
    const c1 = createTestClient(hub);
    hub.handler.dispatch(c1, {
      v: 1, id: "hello", type: "client.hello", payload: {},
    });
    const token = getWelcome(c1).resumeToken;
    c1.sent.length = 0;

    joinSession(hub, c1, "room1");
    hub.handleClientDisconnect(c1);
    hub.removeClient(c1);

    // Wait past resume timeout
    vi.advanceTimersByTime(hub.config.resumeTimeoutMs + 1);

    // Try to resume — token has expired, falls through to fresh connection
    const c2 = createTestClient(hub);
    hub.handler.dispatch(c2, {
      v: 1, id: "hello2", type: "client.hello",
      payload: { resumeToken: token },
    });
    expect(c2.sent[0].type).toBe("server.welcome");
    expect(c2.sent[0].payload.resumed).toBeFalsy();
    expect(c2.sent[0].payload.clientId).toBeDefined();
  });

  it("restores presence on resume", () => {
    const c1 = createTestClient(hub);
    hub.handler.dispatch(c1, {
      v: 1, id: "hello", type: "client.hello", payload: {},
    });
    const token = getWelcome(c1).resumeToken;
    c1.sent.length = 0;

    joinSession(hub, c1, "room1");
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1", payload: { cursor: { x: 10, y: 20 } },
    });
    c1.sent.length = 0;

    hub.handleClientDisconnect(c1);
    hub.removeClient(c1);

    const c2 = createTestClient(hub);
    hub.handler.dispatch(c2, {
      v: 1, id: "hello2", type: "client.hello",
      payload: { resumeToken: token },
    });

    const sess = hub.getSession("room1");
    expect(sess?.getPresence(c2.id)).toEqual({ cursor: { x: 10, y: 20 } });
  });

  it("cancels resume timeout on successful resume", () => {
    const c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room1");

    const other = createTestClient(hub);
    authenticate(hub, other);
    joinSession(hub, other, "room1");
    other.sent.length = 0;

    // Get c1's token from its welcome
    // Need to re-authenticate to get token
    const c1b = createTestClient(hub);
    hub.handler.dispatch(c1b, {
      v: 1, id: "hello", type: "client.hello", payload: {},
    });
    const token = getWelcome(c1b).resumeToken;
    c1b.sent.length = 0;
    joinSession(hub, c1b, "room1");
    other.sent.length = 0;

    hub.handleClientDisconnect(c1b);
    hub.removeClient(c1b);

    // Resume before timeout
    const c1c = createTestClient(hub);
    hub.handler.dispatch(c1c, {
      v: 1, id: "hello2", type: "client.hello",
      payload: { resumeToken: token },
    });

    // Advance past timeout — should NOT broadcast disconnect
    vi.advanceTimersByTime(hub.config.resumeTimeoutMs + 1);
    const disconnects = other.sent.filter((f) => f.type === "client.disconnected");
    expect(disconnects).toHaveLength(0);
  });
});
