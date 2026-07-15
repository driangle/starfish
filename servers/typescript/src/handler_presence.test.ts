import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: StarfishServer, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    v: 1, id: "join", type: "session.join",
    session, payload: { create: true },
  });
  client.sent.length = 0;
}

describe("presence.set", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    vi.useFakeTimers();
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room1");

    c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");

    // Clear any client.connected frames from join
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("broadcasts presence.updated after throttle interval", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 10, y: 20 } },
    });

    // Before tick, no broadcast
    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(0);

    // After 50ms tick
    vi.advanceTimersByTime(50);

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("presence.updated");
    expect(c1.sent[0].session).toBe("room1");
    expect(c1.sent[0].from).toBe(c1.id);
    expect(c1.sent[0].payload).toEqual({ cursor: { x: 10, y: 20 } });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("presence.updated");
    expect(c2.sent[0].from).toBe(c1.id);
  });

  it("coalesces multiple rapid updates — only latest value is broadcast", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 1, y: 1 } },
    });
    hub.handler.dispatch(c1, {
      v: 1, id: "p2", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 2, y: 2 } },
    });
    hub.handler.dispatch(c1, {
      v: 1, id: "p3", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 3, y: 3 } },
    });

    vi.advanceTimersByTime(50);

    // Only one broadcast with the latest value
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].payload).toEqual({ cursor: { x: 3, y: 3 } });
  });

  it("batches updates from multiple clients in a single tick", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: { status: "typing" },
    });
    hub.handler.dispatch(c2, {
      v: 1, id: "p2", type: "presence.set",
      session: "room1",
      payload: { status: "idle" },
    });

    vi.advanceTimersByTime(50);

    // Both clients receive both updates
    expect(c1.sent).toHaveLength(2);
    expect(c2.sent).toHaveLength(2);

    const types = c1.sent.map((f) => f.type);
    expect(types).toEqual(["presence.updated", "presence.updated"]);
  });

  it("rejects payload exceeding 8KB", () => {
    const largePayload = { data: "x".repeat(9000) };
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: largePayload,
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("payload.too_large");

    // No broadcast even after tick
    vi.advanceTimersByTime(50);
    expect(c2.sent).toHaveLength(0);
  });

  it("accepts payload at exactly 8KB", () => {
    // JSON.stringify adds overhead, so account for the wrapper
    const overhead = JSON.stringify({ data: "" }).length;
    const payload = { data: "x".repeat(8 * 1024 - overhead) };

    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload,
    });

    // No error
    expect(c1.sent).toHaveLength(0);

    vi.advanceTimersByTime(50);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("presence.updated");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 1, y: 1 } },
    });

    expect(unauth.sent[0].type).toBe("error");
    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });

  it("requires session membership", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "nonexistent",
      payload: { cursor: { x: 1, y: 1 } },
    });

    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("session.not_found");
  });

  it("cleans up presence on client disconnect", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "presence.set",
      session: "room1",
      payload: { cursor: { x: 10, y: 20 } },
    });

    vi.advanceTimersByTime(50);
    c2.sent.length = 0;

    // Simulate disconnect
    hub.handleClientDisconnect(c1);

    // After disconnect, setting presence for c1 should not appear
    const session = hub.getSession("room1");
    expect(session?.getPresence(c1.id)).toBeUndefined();
  });

  it("does not broadcast after interval when no updates pending", () => {
    vi.advanceTimersByTime(50);
    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(0);
  });

  it("stops throttle timer when session is destroyed", () => {
    // Leave both clients so session is destroyed
    hub.handler.dispatch(c1, {
      v: 1, id: "l1", type: "session.leave", session: "room1",
    });
    c1.sent.length = 0;
    hub.handler.dispatch(c2, {
      v: 1, id: "l2", type: "session.leave", session: "room1",
    });
    c2.sent.length = 0;

    // Session should be gone
    expect(hub.getSession("room1")).toBeUndefined();

    // Advancing time should not throw (timer was stopped)
    vi.advanceTimersByTime(200);
  });
});
