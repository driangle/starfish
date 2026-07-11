import { describe, it, expect, vi, beforeEach } from "vitest";
import { Messaging } from "./messaging.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { RTC } from "./rtc.js";
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

function mockRTC(connectedPeers: string[] = []): RTC {
  const connected = new Set(connectedPeers);
  return {
    isPeerConnected: (id: string) => connected.has(id),
    getConnectedPeerIds: () => connectedPeers,
    sendToPeer: vi.fn(),
  } as unknown as RTC;
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

    messaging.broadcast({ text: "echo" }, { delivery: { includeSelf: true } });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session.broadcast",
        options: { delivery: { includeSelf: true } },
      }),
    );
  });

  it("broadcast() without options does not set options", () => {
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

  describe("transport selection", () => {
    it("send() with preferTransport ws always uses WebSocket", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      messaging.send(
        "alice",
        { text: "hi" },
        {
          delivery: { preferTransport: "ws" },
        },
      );

      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("send() with preferTransport rtc routes via RTC when peer connected", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      messaging.send(
        "alice",
        { text: "hi" },
        {
          delivery: { preferTransport: "rtc" },
        },
      );

      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "alice",
        "starfish.control",
        expect.objectContaining({
          type: "client.send",
          to: "alice",
        }),
      );
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("send() with preferTransport rtc falls back to WS when peer not connected", () => {
      const conn = mockConnection();
      const rtc = mockRTC([]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      messaging.send(
        "alice",
        { text: "hi" },
        {
          delivery: { preferTransport: "rtc" },
        },
      );

      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("send() with preferTransport rtc and fallback false throws when peer not connected", () => {
      const conn = mockConnection();
      const rtc = mockRTC([]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      expect(() =>
        messaging.send(
          "alice",
          { text: "hi" },
          {
            delivery: { preferTransport: "rtc", fallback: false },
          },
        ),
      ).toThrow();
    });

    it("send() uses unreliable channel for unreliable delivery", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      messaging.send(
        "alice",
        { data: [1, 2] },
        {
          delivery: { preferTransport: "rtc", reliability: "unreliable" },
        },
      );

      expect(rtc.sendToPeer).toHaveBeenCalledWith("alice", "starfish.stream", expect.anything());
    });

    it("send() with delivery options includes them in the frame", () => {
      const conn = mockConnection();
      const messaging = new Messaging(conn, mockSession());

      messaging.send(
        "alice",
        { text: "hi" },
        {
          delivery: { preferTransport: "ws", reliability: "unreliable" },
        },
      );

      expect(conn.send).toHaveBeenCalledWith(
        expect.objectContaining({
          options: {
            delivery: { preferTransport: "ws", reliability: "unreliable" },
          },
        }),
      );
    });

    it("send() auto-routes to RTC for connected peers (client.send reliable)", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const messaging = new Messaging(conn, mockSession(), rtc);

      messaging.send("alice", { text: "hi" });

      expect(rtc.sendToPeer).toHaveBeenCalled();
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("send() auto-routes to WS when no RTC", () => {
      const conn = mockConnection();
      const messaging = new Messaging(conn, mockSession());

      messaging.send("alice", { text: "hi" });

      expect(conn.send).toHaveBeenCalled();
    });
  });
});
