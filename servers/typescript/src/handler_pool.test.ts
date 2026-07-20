import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";
import { enterPool, findFrames } from "./pool-test-helpers.js";

describe("pool.enter", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
  });

  it("creates pool with create: true and returns pool.entered", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "auto", groupSize: 2 });

    const entered = findFrames(c1, "pool", "enter");
    expect(entered).toHaveLength(1);
    expect(entered[0].header.replyTo).toBe("enter-lobby");
    const payload = entered[0].payload as Record<string, unknown>;
    expect(payload.pool).toBe("lobby");
    expect(payload.mode).toBe("auto");
    expect(payload.groupSize).toBe(2);
  });

  it("returns pool.not_found without create: true", () => {
    enterPool(hub, c1, { pool: "nonexistent" });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("pool.not_found");
  });

  it("subsequent enters reuse existing pool", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    c1.sent.length = 0;

    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "lobby", create: true, mode: "auto", groupSize: 4 });

    const entered = findFrames(c2, "pool", "enter");
    expect(entered).toHaveLength(1);
    const payload = entered[0].payload as Record<string, unknown>;
    expect(payload.mode).toBe("claim");
    expect(payload.groupSize).toBe(2);
  });

  it("includes members list in claim-based modes", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2, attributes: { name: "alice" } });
    c1.sent.length = 0;

    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "lobby", attributes: { name: "bob" } });

    const entered = findFrames(c2, "pool", "enter");
    const payload = entered[0].payload as Record<string, unknown>;
    const members = payload.members as { id: string; attributes: Record<string, unknown> }[];
    expect(members).toHaveLength(1);
    expect(members[0].id).toBe(c1.id);
    expect(members[0].attributes).toEqual({ name: "alice" });
  });

  it("does not include members list in auto mode", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "auto", groupSize: 2 });

    const entered = findFrames(c1, "pool", "enter");
    const payload = entered[0].payload as Record<string, unknown>;
    expect(payload.members).toBeUndefined();
  });

  it("requires auth", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: { id: "e1", resource: "pool", method: "enter", kind: "request" },
      payload: { pool: "lobby", create: true },
    });
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});

describe("auto mode matching", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    authenticate(hub, c1);
    authenticate(hub, c2);
  });

  it("matches two members FIFO when groupSize is 2", () => {
    enterPool(hub, c1, { pool: "game", create: true, mode: "auto", groupSize: 2 });
    c1.sent.length = 0;

    enterPool(hub, c2, { pool: "game" });

    const c1Matched = findFrames(c1, "pool", "matched");
    const c2Matched = findFrames(c2, "pool", "matched");
    expect(c1Matched).toHaveLength(1);
    expect(c2Matched).toHaveLength(1);

    const payload = c1Matched[0].payload as Record<string, unknown>;
    expect(payload.pool).toBe("game");
    expect(payload.session).toBeDefined();
    // peers excludes the recipient, so a matched pair sees one peer each.
    expect((payload.peers as unknown[]).length).toBe(1);
  });

  it("does not send member events in auto mode", () => {
    enterPool(hub, c1, { pool: "game", create: true, mode: "auto", groupSize: 3 });
    c1.sent.length = 0;

    enterPool(hub, c2, { pool: "game" });

    expect(findFrames(c1, "pool", "member-joined")).toHaveLength(0);
  });

  it("matches with groupSize > 2", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);

    enterPool(hub, c1, { pool: "trio", create: true, mode: "auto", groupSize: 3 });
    enterPool(hub, c2, { pool: "trio" });
    c1.sent.length = 0;
    c2.sent.length = 0;

    expect(findFrames(c1, "pool", "matched")).toHaveLength(0);

    enterPool(hub, c3, { pool: "trio" });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(1);
    expect(findFrames(c2, "pool", "matched")).toHaveLength(1);
    expect(findFrames(c3, "pool", "matched")).toHaveLength(1);
  });

  it("matches with compatible filters", () => {
    enterPool(hub, c1, {
      pool: "filtered", create: true, mode: "auto", groupSize: 2,
      attributes: { language: "en" }, filter: { language: "@self" },
    });
    enterPool(hub, c2, {
      pool: "filtered",
      attributes: { language: "en" }, filter: { language: "@self" },
    });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(1);
    expect(findFrames(c2, "pool", "matched")).toHaveLength(1);
  });

  it("does not match when filters are incompatible", () => {
    enterPool(hub, c1, {
      pool: "filtered", create: true, mode: "auto", groupSize: 2,
      attributes: { language: "en" }, filter: { language: "@self" },
    });
    enterPool(hub, c2, {
      pool: "filtered",
      attributes: { language: "fr" }, filter: { language: "@self" },
    });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(0);
    expect(findFrames(c2, "pool", "matched")).toHaveLength(0);
  });

  it("does not match when target missing filter attribute", () => {
    enterPool(hub, c1, {
      pool: "filtered", create: true, mode: "auto", groupSize: 2,
      attributes: { language: "en" }, filter: { language: "@self" },
    });
    enterPool(hub, c2, { pool: "filtered", attributes: {} });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(0);
  });

  it("matches with literal filter values", () => {
    enterPool(hub, c1, {
      pool: "filtered", create: true, mode: "auto", groupSize: 2,
      attributes: { rank: "gold" }, filter: { rank: "gold" },
    });
    enterPool(hub, c2, { pool: "filtered", attributes: { rank: "gold" } });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(1);
  });

  it("skips incompatible members and matches compatible ones FIFO", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);

    enterPool(hub, c1, {
      pool: "filtered", create: true, mode: "auto", groupSize: 2,
      attributes: { language: "en" }, filter: { language: "@self" },
    });
    enterPool(hub, c2, {
      pool: "filtered",
      attributes: { language: "fr" }, filter: { language: "@self" },
    });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(0);
    c1.sent.length = 0;

    enterPool(hub, c3, {
      pool: "filtered",
      attributes: { language: "en" }, filter: { language: "@self" },
    });

    expect(findFrames(c1, "pool", "matched")).toHaveLength(1);
    expect(findFrames(c3, "pool", "matched")).toHaveLength(1);
    expect(findFrames(c2, "pool", "matched")).toHaveLength(0);
  });
});

describe("pool lifecycle", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    authenticate(hub, c1);
    authenticate(hub, c2);
  });

  it("pool is destroyed when last member leaves", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "auto", groupSize: 3 });
    enterPool(hub, c2, { pool: "lobby" });

    expect(hub.getPool("lobby")).toBeDefined();

    hub.handler.dispatch(c1, {
      header: { id: "leave1", resource: "pool", method: "leave", kind: "request" },
      payload: { pool: "lobby" },
    });
    expect(hub.getPool("lobby")).toBeDefined();

    hub.handler.dispatch(c2, {
      header: { id: "leave2", resource: "pool", method: "leave", kind: "request" },
      payload: { pool: "lobby" },
    });
    expect(hub.getPool("lobby")).toBeUndefined();
  });

  it("pool is destroyed after match removes all members", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });

    hub.handler.dispatch(c1, {
      header: { id: "claim1", resource: "pool", method: "claim", kind: "request" },
      payload: { pool: "lobby", target: c2.id },
    });

    expect(hub.getPool("lobby")).toBeUndefined();
  });

  it("broadcasts pool.member.left with reason left in claim modes", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });
    c2.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: { id: "leave1", resource: "pool", method: "leave", kind: "request" },
      payload: { pool: "lobby" },
    });

    const left = findFrames(c2, "pool", "member-left");
    expect(left).toHaveLength(1);
    const payload = left[0].payload as Record<string, unknown>;
    expect(payload.memberId).toBe(c1.id);
    expect(payload.reason).toBe("left");
  });
});

describe("reconnection", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    vi.useFakeTimers();
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes member from pool on resume timeout and broadcasts pool.member.left", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);

    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });
    c2.sent.length = 0;

    hub.resumes.registerToken(c1, "token123");
    hub.handleClientDisconnect(c1);

    expect(hub.getPool("lobby")).toBeDefined();

    vi.advanceTimersByTime(hub.config.resumeTimeoutMs + 100);

    const left = findFrames(c2, "pool", "member-left");
    expect(left).toHaveLength(1);
    const payload = left[0].payload as Record<string, unknown>;
    expect(payload.memberId).toBe(c1.id);
    expect(payload.reason).toBe("timeout");
  });
});
