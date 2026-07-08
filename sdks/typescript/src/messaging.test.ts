import { describe, it, expect, vi, beforeEach } from "vitest";
import { Messaging } from "./messaging.js";
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

describe("Messaging", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("send() sends client.send frame to a single recipient", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession());

    messaging.send("alice", { text: "hi" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "client.send",
        session: "room-1",
        to: "alice",
        payload: { text: "hi" },
      }),
    );
  });

  it("send() sends to multiple recipients", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession());

    messaging.send(["alice", "bob"], { text: "hi all" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "client.send",
        to: ["alice", "bob"],
        payload: { text: "hi all" },
      }),
    );
  });

  it("send() throws when not in a session", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession(null));

    expect(() => messaging.send("alice", {})).toThrow("Not in a session");
  });

  it("broadcast() sends session.broadcast frame", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession());

    messaging.broadcast({ text: "hello everyone" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session.broadcast",
        session: "room-1",
        payload: { text: "hello everyone" },
      }),
    );
  });

  it("broadcast() with includeSelf sets delivery option", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession());

    messaging.broadcast({ text: "echo" }, { includeSelf: true });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session.broadcast",
        options: { delivery: { includeSelf: true } },
      }),
    );
  });

  it("broadcast() without includeSelf does not set options", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession());

    messaging.broadcast({ text: "hi" });

    const sentFrame = vi.mocked(conn.send).mock.calls[0][0];
    expect(sentFrame.options).toBeUndefined();
  });

  it("broadcast() throws when not in a session", () => {
    const conn = mockConnection();
    const messaging = new Messaging(conn, mockSession(null));

    expect(() => messaging.broadcast({})).toThrow("Not in a session");
  });
});
