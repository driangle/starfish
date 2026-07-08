import { describe, it, expect, vi, beforeEach } from "vitest";
import { Presence } from "./presence.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
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

describe("Presence", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("starts with empty presence map", () => {
    const presence = new Presence(mockConnection(), mockSession());
    expect(presence.presence$.value.size).toBe(0);
  });

  it("set() sends presence.set frame", () => {
    const conn = mockConnection();
    const presence = new Presence(conn, mockSession());

    presence.set({ status: "online", color: "blue" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "presence.set",
        session: "room-1",
        payload: { status: "online", color: "blue" },
      }),
    );
  });

  it("set() throws when not in a session", () => {
    const presence = new Presence(mockConnection(), mockSession(null));

    expect(() => presence.set({ status: "online" })).toThrow(
      "Not in a session",
    );
  });

  it("set() validates payload size", () => {
    const presence = new Presence(mockConnection(), mockSession());
    const largePayload = { data: "x".repeat(10_000) };

    expect(() => presence.set(largePayload)).toThrow("exceeds size limit");
  });

  it("handleFrame presence.updated tracks peer presence", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "away" },
    });

    expect(presence.presence$.value.get("alice")).toEqual({ status: "away" });
  });

  it("handleFrame updates existing presence", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "online" },
    });

    presence.handleFrame({
      v: 1,
      id: "evt_2",
      type: "presence.updated",
      from: "alice",
      payload: { status: "away" },
    });

    expect(presence.presence$.value.get("alice")).toEqual({ status: "away" });
  });

  it("handleFrame tracks multiple clients", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "online" },
    });

    presence.handleFrame({
      v: 1,
      id: "evt_2",
      type: "presence.updated",
      from: "bob",
      payload: { status: "busy" },
    });

    expect(presence.presence$.value.size).toBe(2);
    expect(presence.presence$.value.get("bob")).toEqual({ status: "busy" });
  });

  it("handleFrame ignores frames without from field", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      payload: { status: "online" },
    });

    expect(presence.presence$.value.size).toBe(0);
  });

  it("handleFrame ignores non-presence frames", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "client.connected",
      from: "alice",
      payload: {},
    });

    expect(presence.presence$.value.size).toBe(0);
  });

  it("notifies subscribers on presence changes", () => {
    const presence = new Presence(mockConnection(), mockSession());
    const updates: Map<string, any>[] = [];
    presence.presence$.subscribe((v) => updates.push(v));

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "online" },
    });

    expect(updates).toHaveLength(1);
    expect(updates[0].get("alice")).toEqual({ status: "online" });
  });

  it("emits a new Map instance on each update (immutable)", () => {
    const presence = new Presence(mockConnection(), mockSession());
    const maps: Map<string, any>[] = [];
    presence.presence$.subscribe((v) => maps.push(v));

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "online" },
    });

    presence.handleFrame({
      v: 1,
      id: "evt_2",
      type: "presence.updated",
      from: "bob",
      payload: { status: "away" },
    });

    expect(maps).toHaveLength(2);
    expect(maps[0]).not.toBe(maps[1]);
  });

  it("clear() resets all presence state", () => {
    const presence = new Presence(mockConnection(), mockSession());

    presence.handleFrame({
      v: 1,
      id: "evt_1",
      type: "presence.updated",
      from: "alice",
      payload: { status: "online" },
    });

    presence.clear();

    expect(presence.presence$.value.size).toBe(0);
  });
});
