import { describe, it, expect } from "vitest";
import { poolEnterFrame, poolLeaveFrame, poolClaimFrame } from "./helpers/pool-frames.js";
import { uniquePool, SHORT_TIMEOUT } from "./helpers/setup.js";
import { usePoolClients } from "./helpers/pool-setup.js";

describe("pool auto mode", () => {
  const { authed } = usePoolClients();

  it("two clients are matched in FIFO order", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterB = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");

    expect(matchA.payload?.pool).toBe(pool);
    expect(matchA.payload?.session).toBeTruthy();
    expect(matchA.payload?.peers).toBeInstanceOf(Array);
    expect((matchA.payload?.peers as any[]).length).toBeGreaterThan(0);

    expect(matchB.payload?.pool).toBe(pool);
    expect(matchB.payload?.session).toBe(matchA.payload?.session);
    expect(matchB.payload?.peers).toBeInstanceOf(Array);
  });

  it("three clients entering with groupSize 3 are matched together", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const c = await authed();

    for (const client of [a, b, c]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 3 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }

    const [matchA, matchB, matchC] = await Promise.all([
      a.waitForType("pool.matched"),
      b.waitForType("pool.matched"),
      c.waitForType("pool.matched"),
    ]);

    expect(matchA.payload?.session).toBe(matchB.payload?.session);
    expect(matchB.payload?.session).toBe(matchC.payload?.session);
    expect((matchA.payload?.peers as any[]).length).toBe(2);
  });

  it("matched clients are removed from the pool", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const c = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await a.waitForType("pool.matched");
    await b.waitForType("pool.matched");

    const enterC = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await c.send(enterC);
    await c.waitForReply(enterC.header.id);

    await expect(c.waitForType("pool.matched", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("@self filter: clients with same attribute value are matched", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const c = await authed();

    const enterA = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "@self" },
    });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterC = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "fr" },
      filter: { language: "@self" },
    });
    await c.send(enterC);
    await c.waitForReply(enterC.header.id);

    await expect(a.waitForType("pool.matched", SHORT_TIMEOUT)).rejects.toThrow();

    const enterB = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "@self" },
    });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");
    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });

  it("literal filter: clients are matched by specified attribute value", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "en" },
    });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterB = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "en" },
    });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");
    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });

  it("filter compatibility: @self filter on one side constrains the other", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "@self" },
    });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterB = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
    });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");
    expect(matchA.payload?.session).toBe(matchB.payload?.session);
  });

  it("filter mismatch: incompatible filters prevent matching", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "en" },
      filter: { language: "@self" },
    });
    await a.send(enterA);
    await a.waitForReply(enterA.header.id);

    const enterB = poolEnterFrame(pool, {
      create: true,
      mode: "auto",
      groupSize: 2,
      attributes: { language: "fr" },
      filter: { language: "@self" },
    });
    await b.send(enterB);
    await b.waitForReply(enterB.header.id);

    await expect(a.waitForType("pool.matched", SHORT_TIMEOUT)).rejects.toThrow();
  });
});

describe("pool lifecycle", () => {
  const { authed } = usePoolClients();

  it("entering non-existent pool with create: false returns pool.not_found", async () => {
    const pool = uniquePool();
    const a = await authed();

    const enter = poolEnterFrame(pool, { create: false, mode: "auto", groupSize: 2 });
    await a.send(enter);

    const reply = await a.waitForReply(enter.header.id);
    expect((reply.payload as any)?.error?.code).toBe("pool.not_found");
  });

  it("pool is created on first pool.enter with create: true", async () => {
    const pool = uniquePool();
    const a = await authed();

    const enter = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await a.send(enter);

    const entered = await a.waitForReply(enter.header.id);
    expect(entered.header.resource).toBe("pool");
    expect(entered.header.method).toBe("enter");
    expect(entered.payload?.pool).toBe(pool);
  });

  it("pool is destroyed when last member leaves", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enter = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
    await a.send(enter);
    await a.waitForReply(enter.header.id);

    const leave = poolLeaveFrame(pool);
    await a.send(leave);
    await a.drain();

    const enterB = poolEnterFrame(pool, { create: false, mode: "auto", groupSize: 2 });
    await b.send(enterB);

    const reply = await b.waitForReply(enterB.header.id);
    expect((reply.payload as any)?.error?.code).toBe("pool.not_found");
  });

  it("already-matched member cannot claim again", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();
    const c = await authed();

    for (const client of [a, b, c]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.header.id);
    }
    await a.drain();
    await b.drain();
    await c.drain();

    const claim1 = poolClaimFrame(pool, b.clientId!);
    await a.send(claim1);
    await a.waitForType("pool.matched");
    await b.waitForType("pool.matched");

    const claim2 = poolClaimFrame(pool, c.clientId!);
    await a.send(claim2);

    const reply = await a.waitForReply(claim2.header.id);
    expect((reply.payload as any)?.error).toBeDefined();
    expect(["pool.already_matched", "pool.not_member"]).toContain(
      (reply.payload as any)?.error?.code,
    );
  });
});
