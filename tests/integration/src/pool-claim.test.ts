import { describe, it, expect } from "vitest";
import {
  poolEnterFrame,
  poolLeaveFrame,
  poolClaimFrame,
  poolAcceptFrame,
  poolRejectFrame,
} from "./helpers/pool-frames.js";
import { uniquePool, SHORT_TIMEOUT } from "./helpers/setup.js";
import { usePoolClients } from "./helpers/pool-setup.js";

describe("pool claim mode", () => {
  const { authed } = usePoolClients();

  it("pool.entered includes members array", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, {
      create: true,
      mode: "claim",
      groupSize: 2,
      attributes: { name: "alice" },
    });
    await a.send(enterA);
    const enteredA = await a.waitForReply(enterA.id);
    expect(enteredA.type).toBe("pool.entered");
    expect(enteredA.payload.members).toBeInstanceOf(Array);

    const enterB = poolEnterFrame(pool, {
      create: true,
      mode: "claim",
      groupSize: 2,
      attributes: { name: "bob" },
    });
    await b.send(enterB);
    const enteredB = await b.waitForReply(enterB.id);
    expect(enteredB.type).toBe("pool.entered");
    expect(enteredB.payload.members).toBeInstanceOf(Array);
    expect(enteredB.payload.members.some((m: any) => m.id === a.clientId)).toBe(true);
  });

  it("new member triggers pool.member.joined for existing members", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    const enterA = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
    await a.send(enterA);
    await a.waitForReply(enterA.id);

    const enterB = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
    await b.send(enterB);
    await b.waitForReply(enterB.id);

    const joined = await a.waitForType("pool.member.joined");
    expect(joined.payload.pool).toBe(pool);
    expect(joined.payload.member.id).toBe(b.clientId);
  });

  it("successful claim matches both clients immediately", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");

    expect(matchA.payload.pool).toBe(pool);
    expect(matchA.payload.session).toBeTruthy();
    expect(matchA.payload.session).toBe(matchB.payload.session);
    expect(matchA.payload.peers).toBeInstanceOf(Array);
  });

  it("claiming non-existent target returns pool.target_not_found", async () => {
    const pool = uniquePool();
    const a = await authed();

    const enter = poolEnterFrame(pool, { create: true, mode: "claim", groupSize: 2 });
    await a.send(enter);
    await a.waitForReply(enter.id);

    const claim = poolClaimFrame(pool, "nonexistent-client");
    await a.send(claim);

    const reply = await a.waitForReply(claim.id);
    expect(reply.error?.code).toBe("pool.target_not_found");
  });

  it("pool.claim in auto mode returns pool.mode_mismatch", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "auto", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }
    await a.drain();
    await b.drain();

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);

    const reply = await a.waitForReply(claim.id);
    expect(reply.error?.code).toBe("pool.mode_mismatch");
  });
});

describe("pool mutual mode", () => {
  const { authed } = usePoolClients();

  it("one-sided claim returns pool.claim.pending", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "mutual", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);

    const reply = await a.waitForReply(claim.id);
    expect(reply.type).toBe("pool.claim.pending");
    expect(reply.payload.target).toBe(b.clientId);
  });

  it("mutual claims result in pool.matched for both", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "mutual", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }

    const claimA = poolClaimFrame(pool, b.clientId!);
    await a.send(claimA);
    await a.waitForReply(claimA.id);

    const claimB = poolClaimFrame(pool, a.clientId!);
    await b.send(claimB);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");

    expect(matchA.payload.session).toBe(matchB.payload.session);
  });

  it("member leaving clears pending claim", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "mutual", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);
    await a.waitForReply(claim.id);

    const leave = poolLeaveFrame(pool);
    await a.send(leave);

    const claimB = poolClaimFrame(pool, a.clientId!);
    await b.send(claimB);

    const reply = await b.waitForReply(claimB.id);
    expect(reply.error?.code).toBe("pool.target_not_found");
  });
});

describe("pool propose mode", () => {
  const { authed } = usePoolClients();

  it("pool.claim delivers pool.proposal to target", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, {
        create: true,
        mode: "propose",
        groupSize: 2,
        attributes: { name: client === a ? "alice" : "bob" },
      });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }
    await a.drain();

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);

    const proposal = await b.waitForType("pool.proposal");
    expect(proposal.payload.pool).toBe(pool);
    expect(proposal.payload.from).toBe(a.clientId);
    expect(proposal.payload.attributes).toBeDefined();
  });

  it("accepting a proposal matches both sides", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "propose", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }
    await a.drain();

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);
    await b.waitForType("pool.proposal");

    const accept = poolAcceptFrame(pool, a.clientId!);
    await b.send(accept);

    const matchA = await a.waitForType("pool.matched");
    const matchB = await b.waitForType("pool.matched");

    expect(matchA.payload.session).toBe(matchB.payload.session);
  });

  it("rejecting a proposal sends pool.claim.rejected to proposer", async () => {
    const pool = uniquePool();
    const a = await authed();
    const b = await authed();

    for (const client of [a, b]) {
      const frame = poolEnterFrame(pool, { create: true, mode: "propose", groupSize: 2 });
      await client.send(frame);
      await client.waitForReply(frame.id);
    }
    await a.drain();

    const claim = poolClaimFrame(pool, b.clientId!);
    await a.send(claim);
    await b.waitForType("pool.proposal");

    const reject = poolRejectFrame(pool, a.clientId!);
    await b.send(reject);

    const rejected = await a.waitForType("pool.claim.rejected");
    expect(rejected.payload.pool).toBe(pool);
    expect(rejected.payload.target).toBe(b.clientId);

    await expect(a.waitForType("pool.matched", SHORT_TIMEOUT)).rejects.toThrow();
  });
});
