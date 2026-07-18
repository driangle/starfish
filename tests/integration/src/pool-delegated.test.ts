import { describe, it, expect } from "vitest";
import {
  poolEnterFrame,
  poolLeaveFrame,
  poolClaimFrame,
  poolAssignFrame,
} from "./helpers/pool-frames.js";
import { uniquePool, SHORT_TIMEOUT } from "./helpers/setup.js";
import { usePoolClients } from "./helpers/pool-setup.js";

describe("pool delegated mode", () => {
  const { authed } = usePoolClients();

  it("regular member receives pool.entered without member list", async () => {
    const pool = uniquePool();
    const member = await authed();

    const enter = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
    await member.send(enter);
    const entered = await member.waitForReply(enter.header.id);

    expect(entered.header.resource).toBe("pool");
    expect(entered.header.method).toBe("enter");
    expect(entered.payload?.members).toBeUndefined();
  });

  it("matchmaker receives pool.entered", async () => {
    const pool = uniquePool();
    const mm = await authed();

    const enter = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enter);
    const entered = await mm.waitForReply(enter.header.id);

    expect(entered.header.resource).toBe("pool");
    expect(entered.header.method).toBe("enter");
  });

  it("matchmaker receives pool.member-joined when regular member enters", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const member = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    const enterMember = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
    await member.send(enterMember);
    await member.waitForReply(enterMember.header.id);

    const joined = await mm.waitForType("pool.member-joined");
    expect((joined.payload?.member as any).id).toBe(member.clientId);
  });

  it("pool.assign matches members and returns pool.assigned", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const a = await authed();
    const b = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await mm.drain();

    const assign = poolAssignFrame(pool, [[a.clientId!, b.clientId!]]);
    await mm.send(assign);

    const assigned = await mm.waitForReply(assign.header.id);
    expect(assigned.header.resource).toBe("pool");
    expect(assigned.header.method).toBe("assign");
    expect(assigned.payload?.matched).toBeInstanceOf(Array);
    expect((assigned.payload?.matched as any[])[0].session).toBeTruthy();
    expect((assigned.payload?.matched as any[])[0].group).toContain(a.clientId);
    expect((assigned.payload?.matched as any[])[0].group).toContain(b.clientId);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");
    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });

  it("assigning non-existent member returns pool.target_not_found", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const a = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    const enterA = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);
    await mm.drain();

    const assign = poolAssignFrame(pool, [[a.clientId!, "nonexistent-client"]]);
    await mm.send(assign);

    const reply = await mm.waitForReply(assign.header.id);
    expect((reply.payload as any)?.error?.code).toBe("pool.target_not_found");
  });

  it("non-matchmaker sending pool.assign returns pool.role_required", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const a = await authed();
    const b = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await mm.drain();

    const assign = poolAssignFrame(pool, [[a.clientId!, b.clientId!]]);
    await a.send(assign);

    const reply = await a.waitForReply(assign.header.id);
    expect((reply.payload as any)?.error?.code).toBe("pool.role_required");
  });

  it("assigning a group with wrong size returns pool.invalid_group", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const a = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    const enterA = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);
    await mm.drain();

    const assign = poolAssignFrame(pool, [[a.clientId!]]);
    await mm.send(assign);

    const reply = await mm.waitForReply(assign.header.id);
    expect((reply.payload as any)?.error?.code).toBe("pool.invalid_group");
  });
});

describe("pool member events", () => {
  const { authed } = usePoolClients();

  it("in claim mode, leaving triggers pool.member-left with reason 'left'", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await a.drain();

    const leave = poolLeaveFrame(pool);
    await b.send(leave);

    const left = await a.waitForType("pool.member-left");
    expect(left.payload?.pool).toBe(pool);
    expect(left.payload?.memberId).toBe(b.clientId);
    expect(left.payload?.reason).toBe("left");
  });

  it("in delegated mode, member leaving triggers pool.member-left to matchmaker only", async () => {
    const pool = uniquePool();
    const mm = await authed();
    const a = await authed();
    const b = await authed();

    const enterMM = poolEnterFrame(pool, {
      create: true,
      mode: "delegated",
      groupSize: 2,
      role: "matchmaker",
    });
    await mm.send(enterMM);
    await mm.waitForReply(enterMM.header.id);

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "delegated", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await mm.drain();
    await a.drain();

    const leave = poolLeaveFrame(pool);
    await b.send(leave);

    const left = await mm.waitForType("pool.member-left");
    expect(left.payload?.memberId).toBe(b.clientId);
    expect(left.payload?.reason).toBe("left");

    await expect(a.waitForType("pool.member-left", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("in auto mode, no member events are sent", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 3 });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterB = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 3 });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    await expect(a.waitForType("pool.member-joined", SHORT_TIMEOUT)).rejects.toThrow();

    const leave = poolLeaveFrame(pool);
    await b.send(leave);
    await expect(a.waitForType("pool.member-left", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("after match in claim mode, remaining members receive pool.member-left with reason 'matched'", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const c = await authed();

    for (const client of [a, b, c]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await c.drain();

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);
    await a.waitForType("pool.matched");
    await b.waitForType("pool.matched");

    const left1 = await c.waitForType("pool.member-left");
    const left2 = await c.waitForType("pool.member-left");

    const leftIds = [left1.payload?.memberId, left2.payload?.memberId].sort();
    const expectedIds = [a.clientId!, b.clientId!].sort();
    expect(leftIds).toEqual(expectedIds);
    expect(left1.payload?.reason).toBe("matched");
    expect(left2.payload?.reason).toBe("matched");
  });
});

describe("pool resume", () => {
  const { track, authed } = usePoolClients();

  it("disconnected client retains pool membership within resume window", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const resumeToken = a.resumeToken!;

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await b.drain();

    await a.close();

    await expect(b.waitForType("pool.member-left", SHORT_TIMEOUT)).rejects.toThrow();

    const a2 = await track();
    await a2.hello({ resumeToken });

    const claim = poolClaimFrame(pool, a2.clientId!);
    await b.send(claim);

    const matchB = await b.waitForType("pool.matched");
    const matchA = await a2.waitForType("pool.matched");

    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });

  it("reconnected client can still be matched", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const resumeToken = a.resumeToken!;

    const enterA = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    await a.close();

    const a2 = await track();
    await a2.hello({ resumeToken });

    const enterB = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    const matchA = await a2.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");

    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });
});
