import { describe, it, expect, vi, beforeEach } from "vitest";
import { Data } from "./data.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { StarfishFrame, DataResult } from "./types.js";
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

function saveResponse(overrides: Partial<DataResult> = {}): StarfishFrame {
  return {
    v: 1,
    id: "resp_1",
    type: "data.saved",
    replyTo: "dsave_1",
    payload: {
      key: "score",
      scope: "session",
      data: { value: 42 },
      version: 1,
      ...overrides,
    },
  };
}

describe("Data", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  // --- save() ---

  it("save() sends data.save frame and returns result", async () => {
    const conn = mockConnection();
    const data = new Data(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue(saveResponse());

    const result = await data.save({
      key: "score",
      scope: "session",
      op: "replace",
      data: { value: 42 },
    });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "data.save",
        session: "room-1",
        payload: expect.objectContaining({
          key: "score",
          scope: "session",
          op: "replace",
          data: { value: 42 },
        }),
      }),
    );
    expect(result).toEqual({
      key: "score",
      scope: "session",
      data: { value: 42 },
      version: 1,
    });
  });

  it("save() includes expectedVersion for optimistic concurrency", async () => {
    const conn = mockConnection();
    const data = new Data(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue(saveResponse({ version: 2 }));

    await data.save({
      key: "score",
      scope: "session",
      op: "merge",
      data: { bonus: 10 },
      expectedVersion: 1,
    });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          expectedVersion: 1,
        }),
      }),
    );
  });

  it("save() omits data field when undefined (e.g. delete op)", async () => {
    const conn = mockConnection();
    const data = new Data(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue(saveResponse({ data: undefined, version: 3 }));

    await data.save({
      key: "score",
      scope: "session",
      op: "delete",
    });

    const sentPayload = vi.mocked(conn.sendAndWait).mock.calls[0][0].payload;
    expect(sentPayload).not.toHaveProperty("data");
  });

  it("save() validates data size", async () => {
    const data = new Data(mockConnection(), mockSession());
    const largeData = "x".repeat(300_000);

    await expect(
      data.save({
        key: "big",
        scope: "session",
        op: "replace",
        data: largeData,
      }),
    ).rejects.toThrow("exceeds size limit");
  });

  it("save() throws when not in a session", async () => {
    const data = new Data(mockConnection(), mockSession(null));

    await expect(data.save({ key: "k", scope: "self", op: "replace", data: 1 })).rejects.toThrow(
      "Not in a session",
    );
  });

  // --- get() ---

  it("get() sends data.get frame and returns result", async () => {
    const conn = mockConnection();
    const data = new Data(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      v: 1,
      id: "resp_1",
      type: "data.result",
      replyTo: "dget_1",
      payload: {
        key: "score",
        scope: "session",
        data: { value: 42 },
        version: 1,
      },
    });

    const result = await data.get({ key: "score", scope: "session" });

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "data.get",
        session: "room-1",
        payload: { key: "score", scope: "session" },
      }),
    );
    expect(result).toEqual({
      key: "score",
      scope: "session",
      data: { value: 42 },
      version: 1,
    });
  });

  it("get() throws when not in a session", async () => {
    const data = new Data(mockConnection(), mockSession(null));

    await expect(data.get({ key: "k", scope: "self" })).rejects.toThrow("Not in a session");
  });

  // --- data.changed handling ---

  it("handleFrame emits data.changed to changed$", () => {
    const data = new Data(mockConnection(), mockSession());
    const cb = vi.fn();
    data.changed$.subscribe(cb);

    data.handleFrame({
      v: 1,
      id: "evt_1",
      type: "data.changed",
      payload: {
        key: "score",
        scope: "session",
        data: { value: 99 },
        version: 5,
      },
    });

    expect(cb).toHaveBeenCalledWith({
      key: "score",
      scope: "session",
      data: { value: 99 },
      version: 5,
    });
  });

  it("handleFrame routes data.changed to key-specific stream", () => {
    const data = new Data(mockConnection(), mockSession());
    const scoreCb = vi.fn();
    const healthCb = vi.fn();
    data.key$("score").subscribe(scoreCb);
    data.key$("health").subscribe(healthCb);

    data.handleFrame({
      v: 1,
      id: "evt_1",
      type: "data.changed",
      payload: { key: "score", scope: "session", data: 100, version: 2 },
    });

    expect(scoreCb).toHaveBeenCalledTimes(1);
    expect(healthCb).not.toHaveBeenCalled();
  });

  it("handleFrame ignores non-data.changed frames", () => {
    const data = new Data(mockConnection(), mockSession());
    const cb = vi.fn();
    data.changed$.subscribe(cb);

    data.handleFrame({
      v: 1,
      id: "evt_1",
      type: "client.connected",
      payload: { key: "score" },
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it("handleFrame ignores data.changed without payload", () => {
    const data = new Data(mockConnection(), mockSession());
    const cb = vi.fn();
    data.changed$.subscribe(cb);

    data.handleFrame({
      v: 1,
      id: "evt_1",
      type: "data.changed",
    });

    expect(cb).not.toHaveBeenCalled();
  });

  it("key$() returns the same stream for the same key", () => {
    const data = new Data(mockConnection(), mockSession());
    expect(data.key$("score")).toBe(data.key$("score"));
  });

  it("key$() returns different streams for different keys", () => {
    const data = new Data(mockConnection(), mockSession());
    expect(data.key$("score")).not.toBe(data.key$("health"));
  });
});
