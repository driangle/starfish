import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";
import { enterPool, findFrames } from "./pool-test-helpers.js";

describe("claim mode", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };
  let c3: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    c3 = createTestClient(hub);
    authenticate(hub, c1);
    authenticate(hub, c2);
    authenticate(hub, c3);
  });

  it("immediately matches on first claim", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });

    expect(findFrames(c1, "pool.matched")).toHaveLength(1);
    expect(findFrames(c2, "pool.matched")).toHaveLength(1);

    const payload = findFrames(c1, "pool.matched")[0].payload as Record<string, unknown>;
    expect(payload.session).toBeDefined();
    expect((payload.peers as unknown[]).length).toBe(2);
  });

  it("broadcasts member.left with reason matched to remaining members", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });
    enterPool(hub, c3, { pool: "lobby" });
    c3.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });

    const leftEvents = findFrames(c3, "pool.member.left");
    expect(leftEvents.length).toBeGreaterThanOrEqual(2);
    const reasons = leftEvents.map((f) => (f.payload as Record<string, unknown>).reason);
    expect(reasons.every((r) => r === "matched")).toBe(true);
  });

  it("broadcasts member.joined to existing members in claim-based modes", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    c1.sent.length = 0;

    enterPool(hub, c2, { pool: "lobby" });

    const joined = findFrames(c1, "pool.member.joined");
    expect(joined).toHaveLength(1);
    const payload = joined[0].payload as Record<string, unknown>;
    const member = payload.member as { id: string };
    expect(member.id).toBe(c2.id);
  });
});

describe("mutual mode", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    authenticate(hub, c1);
    authenticate(hub, c2);
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "mutual", groupSize: 2 });
    enterPool(hub, c2, { pool: "lobby" });
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("returns pool.claim.pending when only one side claims", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });

    const pending = findFrames(c1, "pool.claim.pending");
    expect(pending).toHaveLength(1);
    expect(pending[0].replyTo).toBe("claim1");
    expect(findFrames(c1, "pool.matched")).toHaveLength(0);
  });

  it("matches when both sides claim each other", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });
    hub.handler.dispatch(c2, {
      v: 1, id: "claim2", type: "pool.claim",
      payload: { pool: "lobby", target: c1.id },
    });

    expect(findFrames(c1, "pool.matched")).toHaveLength(1);
    expect(findFrames(c2, "pool.matched")).toHaveLength(1);
  });
});

describe("propose mode", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    authenticate(hub, c1);
    authenticate(hub, c2);
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "propose", groupSize: 2, attributes: { name: "alice" } });
    enterPool(hub, c2, { pool: "lobby", attributes: { name: "bob" } });
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("sends pool.proposal to target on claim", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });

    const proposals = findFrames(c2, "pool.proposal");
    expect(proposals).toHaveLength(1);
    const payload = proposals[0].payload as Record<string, unknown>;
    expect(payload.from).toBe(c1.id);
    expect(payload.attributes).toEqual({ name: "alice" });
  });

  it("matches on pool.accept", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c2, {
      v: 1, id: "accept1", type: "pool.accept",
      payload: { pool: "lobby", from: c1.id },
    });

    expect(findFrames(c1, "pool.matched")).toHaveLength(1);
    expect(findFrames(c2, "pool.matched")).toHaveLength(1);
  });

  it("sends pool.claim.rejected on reject", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c2, {
      v: 1, id: "reject1", type: "pool.reject",
      payload: { pool: "lobby", from: c1.id },
    });

    const rejected = findFrames(c1, "pool.claim.rejected");
    expect(rejected).toHaveLength(1);
    expect((rejected[0].payload as Record<string, unknown>).target).toBe(c2.id);
    expect(findFrames(c1, "pool.matched")).toHaveLength(0);
    expect(findFrames(c2, "pool.matched")).toHaveLength(0);
  });
});

describe("delegated mode", () => {
  let hub: StarfishServer;
  let matchmaker: Client & { sent: StarfishFrame[] };
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    matchmaker = createTestClient(hub);
    c1 = createTestClient(hub);
    c2 = createTestClient(hub);
    authenticate(hub, matchmaker);
    authenticate(hub, c1);
    authenticate(hub, c2);
    enterPool(hub, matchmaker, { pool: "ranked", create: true, mode: "delegated", groupSize: 2, role: "matchmaker" });
    matchmaker.sent.length = 0;
  });

  it("matchmaker receives member.joined events", () => {
    enterPool(hub, c1, { pool: "ranked", attributes: { elo: 1200 } });

    const joined = findFrames(matchmaker, "pool.member.joined");
    expect(joined).toHaveLength(1);
    const member = (joined[0].payload as Record<string, unknown>).member as { id: string; attributes: Record<string, unknown> };
    expect(member.id).toBe(c1.id);
    expect(member.attributes).toEqual({ elo: 1200 });
  });

  it("regular members do not receive member events", () => {
    enterPool(hub, c1, { pool: "ranked" });
    c1.sent.length = 0;
    enterPool(hub, c2, { pool: "ranked" });
    expect(findFrames(c1, "pool.member.joined")).toHaveLength(0);
  });

  it("pool.assign fires matches and sends pool.assigned", () => {
    enterPool(hub, c1, { pool: "ranked" });
    enterPool(hub, c2, { pool: "ranked" });
    matchmaker.sent.length = 0;
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(matchmaker, {
      v: 1, id: "assign1", type: "pool.assign",
      payload: { pool: "ranked", groups: [[c1.id, c2.id]] },
    });

    expect(findFrames(c1, "pool.matched")).toHaveLength(1);
    expect(findFrames(c2, "pool.matched")).toHaveLength(1);

    const assigned = findFrames(matchmaker, "pool.assigned");
    expect(assigned).toHaveLength(1);
    expect(assigned[0].replyTo).toBe("assign1");
    const matched = (assigned[0].payload as Record<string, unknown>).matched as { group: string[]; session: string }[];
    expect(matched).toHaveLength(1);
    expect(matched[0].group).toEqual([c1.id, c2.id]);
    expect(matched[0].session).toBeDefined();
    expect(findFrames(matchmaker, "pool.member.left")).toHaveLength(2);
  });

  it("non-matchmaker gets pool.role_required", () => {
    enterPool(hub, c1, { pool: "ranked" });
    enterPool(hub, c2, { pool: "ranked" });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "assign1", type: "pool.assign",
      payload: { pool: "ranked", groups: [[c1.id, c2.id]] },
    });
    expect(c1.sent[0].error?.code).toBe("pool.role_required");
  });

  it("rejects pool.claim in delegated mode", () => {
    enterPool(hub, c1, { pool: "ranked" });
    enterPool(hub, c2, { pool: "ranked" });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "ranked", target: c2.id },
    });
    expect(c1.sent[0].error?.code).toBe("pool.mode_mismatch");
  });
});

describe("error paths", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
  });

  it("pool.leave on nonexistent pool returns pool.not_found", () => {
    hub.handler.dispatch(c1, { v: 1, id: "l1", type: "pool.leave", payload: { pool: "nonexistent" } });
    expect(c1.sent[0].error?.code).toBe("pool.not_found");
  });

  it("pool.leave when not a member returns pool.not_member", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "lobby", create: true, mode: "auto", groupSize: 2 });

    hub.handler.dispatch(c1, { v: 1, id: "l1", type: "pool.leave", payload: { pool: "lobby" } });
    expect(c1.sent[0].error?.code).toBe("pool.not_member");
  });

  it("pool.claim on nonexistent target returns pool.target_not_found", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: "nonexistent" },
    });
    expect(c1.sent[0].error?.code).toBe("pool.target_not_found");
  });

  it("pool.claim in auto mode returns pool.mode_mismatch", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "auto", groupSize: 3 });
    c1.sent.length = 0;

    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "lobby" });

    hub.handler.dispatch(c1, {
      v: 1, id: "claim1", type: "pool.claim",
      payload: { pool: "lobby", target: c2.id },
    });
    expect(c1.sent[0].error?.code).toBe("pool.mode_mismatch");
  });

  it("pool.assign with wrong group size returns pool.invalid_group", () => {
    enterPool(hub, c1, { pool: "ranked", create: true, mode: "delegated", groupSize: 2, role: "matchmaker" });
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "ranked" });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "assign1", type: "pool.assign",
      payload: { pool: "ranked", groups: [[c2.id]] },
    });
    expect(c1.sent[0].error?.code).toBe("pool.invalid_group");
  });

  it("pool.assign with nonexistent member returns pool.target_not_found", () => {
    enterPool(hub, c1, { pool: "ranked", create: true, mode: "delegated", groupSize: 2, role: "matchmaker" });
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    enterPool(hub, c2, { pool: "ranked" });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "assign1", type: "pool.assign",
      payload: { pool: "ranked", groups: [[c2.id, "nonexistent"]] },
    });
    expect(c1.sent[0].error?.code).toBe("pool.target_not_found");
  });

  it("pool.assign in non-delegated mode returns pool.mode_mismatch", () => {
    enterPool(hub, c1, { pool: "lobby", create: true, mode: "claim", groupSize: 2 });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "assign1", type: "pool.assign",
      payload: { pool: "lobby", groups: [] },
    });
    expect(c1.sent[0].error?.code).toBe("pool.mode_mismatch");
  });
});
