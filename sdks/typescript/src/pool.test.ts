import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pool } from "./pool.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { PoolMatchedEvent } from "./pool-types.js";
import { resetIdCounter } from "./id.js";

function mockConnection(): Connection {
  return {
    clientId: "me",
    send: vi.fn(),
    sendAndWait: vi.fn(),
  } as unknown as Connection;
}

function mockSession(current: string | null = "room-1"): Session {
  return { current } as unknown as Session;
}

function enterResponse(payload: Record<string, unknown> = {}) {
  return {
    header: { id: "resp_1", resource: "pool", method: "enter", kind: "response" as const },
    payload: { status: "ok", pool: "lobby", ...payload },
  };
}

function poolEvent(method: string, payload: Record<string, unknown>) {
  return {
    header: { id: `evt_${method}`, resource: "pool", method, kind: "event" as const },
    payload,
  };
}

describe("Pool", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("starts with empty members", () => {
    const pool = new Pool(mockConnection(), mockSession());
    expect(pool.members$.value).toEqual([]);
  });

  it("enter() sends pool.enter frame and resolves with response", async () => {
    const conn = mockConnection();
    const response = enterResponse({ mode: "auto", groupSize: 2 });
    vi.mocked(conn.sendAndWait).mockResolvedValue(response);

    const pool = new Pool(conn, mockSession());
    const result = await pool.enter("lobby", { groupSize: 2 });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "enter" }),
        payload: expect.objectContaining({ pool: "lobby", groupSize: 2 }),
      }),
    );
    expect(result).toBe(response);
  });

  it("enter() populates members$ from response in claim-based modes", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(
      enterResponse({
        mode: "claim",
        groupSize: 2,
        members: [
          { id: "alice", attributes: { mood: "calm" } },
          { id: "bob", attributes: { mood: "wild" } },
        ],
      }),
    );

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });

    expect(pool.members$.value).toEqual([
      { id: "alice", attributes: { mood: "calm" } },
      { id: "bob", attributes: { mood: "wild" } },
    ]);
  });

  it("enter() sends all options in the frame payload", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", {
      groupSize: 3,
      mode: "delegated",
      role: "matchmaker",
      attributes: { region: "us" },
      filter: { language: "@self" },
      create: true,
    });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          pool: "lobby",
          groupSize: 3,
          mode: "delegated",
          role: "matchmaker",
          attributes: { region: "us" },
          filter: { language: "@self" },
          create: true,
        },
      }),
    );
  });

  it("enter() throws when not in a session", async () => {
    const pool = new Pool(mockConnection(), mockSession(null));
    await expect(pool.enter("lobby", { groupSize: 2 })).rejects.toThrow("Not in a session");
  });

  it("leave() sends pool.leave frame", () => {
    const conn = mockConnection();
    const pool = new Pool(conn, mockSession());
    pool.leave("lobby");

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "leave" }),
        payload: { pool: "lobby" },
      }),
    );
  });

  it("leave() throws when not in a session", () => {
    const pool = new Pool(mockConnection(), mockSession(null));
    expect(() => pool.leave("lobby")).toThrow("Not in a session");
  });

  it("claim() sends pool.claim frame", () => {
    const conn = mockConnection();
    const pool = new Pool(conn, mockSession());
    pool.claim("lobby", "alice");

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "claim" }),
        payload: { pool: "lobby", target: "alice" },
      }),
    );
  });

  it("accept() sends pool.accept frame", () => {
    const conn = mockConnection();
    const pool = new Pool(conn, mockSession());
    pool.accept("lobby", "alice");

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "accept" }),
        payload: { pool: "lobby", from: "alice" },
      }),
    );
  });

  it("reject() sends pool.reject frame", () => {
    const conn = mockConnection();
    const pool = new Pool(conn, mockSession());
    pool.reject("lobby", "alice");

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "reject" }),
        payload: { pool: "lobby", from: "alice" },
      }),
    );
  });

  it("assign() sends pool.assign frame and resolves with response", async () => {
    const conn = mockConnection();
    const response = {
      header: {
        id: "resp_1",
        resource: "pool",
        method: "assign",
        kind: "response",
        replyTo: "pool_1",
      },
      payload: {
        status: "ok",
        pool: "lobby",
        matched: [{ group: ["alice", "bob"], session: "dt-abc" }],
      },
    };
    vi.mocked(conn.sendAndWait).mockResolvedValue(response);

    const pool = new Pool(conn, mockSession());
    const result = await pool.assign("lobby", [["alice", "bob"]]);

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "pool", method: "assign" }),
        payload: { pool: "lobby", groups: [["alice", "bob"]] },
      }),
    );
    expect(result).toBe(response);
  });

  it("members$ updates on member-joined", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse({ mode: "claim", groupSize: 2 }));

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });

    pool.handleFrame(
      poolEvent("member-joined", {
        pool: "lobby",
        member: { id: "alice", attributes: { mood: "calm" } },
      }),
    );

    expect(pool.members$.value).toEqual([{ id: "alice", attributes: { mood: "calm" } }]);
  });

  it("members$ updates on member-left", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(
      enterResponse({ mode: "claim", groupSize: 2, members: [{ id: "alice" }, { id: "bob" }] }),
    );

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });

    pool.handleFrame(
      poolEvent("member-left", { pool: "lobby", memberId: "alice", reason: "left" }),
    );
    expect(pool.members$.value).toEqual([{ id: "bob" }]);
  });

  it("matched$ emits on matched event", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2 });

    const events: PoolMatchedEvent[] = [];
    pool.matched$.subscribe((e) => events.push(e));

    pool.handleFrame(
      poolEvent("matched", {
        pool: "lobby",
        session: "dt-abc",
        peers: [
          { id: "me", attributes: {} },
          { id: "alice", attributes: {} },
        ],
      }),
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      pool: "lobby",
      session: "dt-abc",
      peers: [
        { id: "me", attributes: {} },
        { id: "alice", attributes: {} },
      ],
    });
  });

  it("matched$ clears state after matching", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse({ members: [{ id: "alice" }] }));

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });
    expect(pool.members$.value).toHaveLength(1);

    pool.handleFrame(
      poolEvent("matched", {
        pool: "lobby",
        session: "dt-abc",
        peers: [{ id: "me" }, { id: "alice" }],
      }),
    );
    expect(pool.members$.value).toEqual([]);
  });

  it("ignores frames for other pools", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2 });

    pool.handleFrame(poolEvent("member-joined", { pool: "other-pool", member: { id: "alice" } }));
    expect(pool.members$.value).toEqual([]);
  });

  it("ignores frames without pool payload", () => {
    const pool = new Pool(mockConnection(), mockSession());
    pool.handleFrame(poolEvent("member-joined", { member: { id: "alice" } }));
    expect(pool.members$.value).toEqual([]);
  });

  it("proposal$ emits on proposal event", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "propose" });

    const proposals: any[] = [];
    pool.proposal$.subscribe((p) => proposals.push(p));

    pool.handleFrame(
      poolEvent("proposal", { pool: "lobby", from: "alice", attributes: { mood: "calm" } }),
    );

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toEqual({ pool: "lobby", from: "alice", attributes: { mood: "calm" } });
  });

  it("claimRejected$ emits on claim-rejected event", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "propose" });

    const rejections: any[] = [];
    pool.claimRejected$.subscribe((r) => rejections.push(r));

    pool.handleFrame(poolEvent("claim-rejected", { pool: "lobby", target: "bob" }));

    expect(rejections).toHaveLength(1);
    expect(rejections[0]).toEqual({ pool: "lobby", target: "bob" });
  });

  it("clear() resets member state", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse({ members: [{ id: "alice" }] }));

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });
    expect(pool.members$.value).toHaveLength(1);

    pool.clear();
    expect(pool.members$.value).toEqual([]);
  });

  it("members$ notifies subscribers on changes", async () => {
    const conn = mockConnection();
    vi.mocked(conn.sendAndWait).mockResolvedValue(enterResponse());

    const pool = new Pool(conn, mockSession());
    await pool.enter("lobby", { groupSize: 2, mode: "claim" });

    const updates: any[][] = [];
    pool.members$.subscribe((v) => updates.push(v));

    pool.handleFrame(poolEvent("member-joined", { pool: "lobby", member: { id: "alice" } }));
    pool.handleFrame(poolEvent("member-joined", { pool: "lobby", member: { id: "bob" } }));

    expect(updates).toHaveLength(2);
    expect(updates[0]).toEqual([{ id: "alice" }]);
    expect(updates[1]).toEqual([{ id: "alice" }, { id: "bob" }]);
  });
});
