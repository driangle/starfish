import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topics } from "./topics.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { RTC } from "./rtc.js";
import type { StarfishFrame } from "./types.js";
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

describe("Topics", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("subscribe() sends topic.subscribe and tracks subscription", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      v: 1,
      id: "resp_1",
      type: "topic.subscribed",
      replyTo: "sub_1",
    });

    const response = await topics.subscribe("chat");

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "topic.subscribe",
        session: "room-1",
        topic: "chat",
      }),
    );
    expect(response.type).toBe("topic.subscribed");
  });

  it("subscribe() with callback wires it to topic$ stream", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    vi.mocked(conn.sendAndWait).mockResolvedValue({
      v: 1,
      id: "resp_1",
      type: "topic.subscribed",
      replyTo: "sub_1",
    });

    const callback = vi.fn();
    await topics.subscribe("chat", callback);

    const msgFrame: StarfishFrame = {
      v: 1,
      id: "msg_1",
      type: "topic.message",
      topic: "chat",
      payload: { text: "hello" },
    };
    topics.handleFrame(msgFrame);

    expect(callback).toHaveBeenCalledWith(msgFrame);
  });

  it("subscribe() throws when not in a session", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession(null));

    await expect(topics.subscribe("chat")).rejects.toThrow("Not in a session");
  });

  it("subscribe() validates topic name length", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());
    const longName = "x".repeat(200);

    await expect(topics.subscribe(longName)).rejects.toThrow("exceeds 128 characters");
  });

  it("unsubscribe() sends topic.unsubscribe", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    await topics.unsubscribe("chat");

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "topic.unsubscribe",
        session: "room-1",
        topic: "chat",
      }),
    );
  });

  it("unsubscribe() throws when not in a session", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession(null));

    await expect(topics.unsubscribe("chat")).rejects.toThrow("Not in a session");
  });

  it("publish() sends topic.publish with payload", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    topics.publish("chat", { text: "hello" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "topic.publish",
        session: "room-1",
        topic: "chat",
        payload: { text: "hello" },
      }),
    );
  });

  it("publish() includes frame options when provided", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    topics.publish("chat", { text: "hi" }, { priority: "high" });

    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "topic.publish",
        options: { priority: "high" },
      }),
    );
  });

  it("publish() throws when not in a session", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession(null));

    expect(() => topics.publish("chat", {})).toThrow("Not in a session");
  });

  it("topic$() returns the same stream for the same topic", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    const stream1 = topics.topic$("chat");
    const stream2 = topics.topic$("chat");

    expect(stream1).toBe(stream2);
  });

  it("topic$() returns different streams for different topics", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    const stream1 = topics.topic$("chat");
    const stream2 = topics.topic$("events");

    expect(stream1).not.toBe(stream2);
  });

  it("handleFrame routes topic.message to the correct stream", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    const chatCb = vi.fn();
    const eventsCb = vi.fn();
    topics.topic$("chat").subscribe(chatCb);
    topics.topic$("events").subscribe(eventsCb);

    const frame: StarfishFrame = {
      v: 1,
      id: "msg_1",
      type: "topic.message",
      topic: "chat",
      payload: { text: "hello" },
    };
    topics.handleFrame(frame);

    expect(chatCb).toHaveBeenCalledWith(frame);
    expect(eventsCb).not.toHaveBeenCalled();
  });

  it("handleFrame ignores messages for topics without streams", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    // Should not throw
    topics.handleFrame({
      v: 1,
      id: "msg_1",
      type: "topic.message",
      topic: "unknown",
      payload: {},
    });
  });

  it("handleFrame ignores non-topic.message frames", () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());

    const cb = vi.fn();
    topics.topic$("chat").subscribe(cb);

    topics.handleFrame({
      v: 1,
      id: "msg_1",
      type: "client.connected",
      topic: "chat",
      payload: {},
    });

    expect(cb).not.toHaveBeenCalled();
  });

  describe("topic.peers subscription map", () => {
    it("tracks subscription map from topic.peers frame", () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["alice", "bob"] },
      });

      expect(topics.getTopicPeers("pose")).toEqual(["alice", "bob"]);
    });

    it("replaces subscription map on subsequent topic.peers", () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["alice", "bob"] },
      });

      topics.handleFrame({
        v: 1,
        id: "evt_2",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["charlie"] },
      });

      expect(topics.getTopicPeers("pose")).toEqual(["charlie"]);
    });

    it("returns empty array for topics without peers", () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      expect(topics.getTopicPeers("unknown")).toEqual([]);
    });

    it("clears topic peers on unsubscribe", async () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["alice"] },
      });

      await topics.unsubscribe("pose");
      expect(topics.getTopicPeers("pose")).toEqual([]);
    });
  });

  describe("receiver-side validation", () => {
    it("delivers RTC topic messages for subscribed topics", async () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      vi.mocked(conn.sendAndWait).mockResolvedValue({
        v: 1,
        id: "resp_1",
        type: "topic.subscribed",
        replyTo: "sub_1",
      });

      const cb = vi.fn();
      await topics.subscribe("chat", cb);

      topics.handleFrame({
        v: 1,
        id: "msg_1",
        type: "topic.message",
        topic: "chat",
        transport: "rtc",
        payload: { text: "hello" },
      });

      expect(cb).toHaveBeenCalled();
    });

    it("drops RTC topic messages for unsubscribed topics silently", () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      const cb = vi.fn();
      topics.topic$("secret").subscribe(cb);

      topics.handleFrame({
        v: 1,
        id: "msg_1",
        type: "topic.message",
        topic: "secret",
        transport: "rtc",
        payload: { text: "unauthorized" },
      });

      expect(cb).not.toHaveBeenCalled();
    });

    it("delivers WS topic messages regardless of subscription tracking", () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());

      const cb = vi.fn();
      topics.topic$("chat").subscribe(cb);

      // WS messages (no transport or transport: "ws") are delivered without validation
      topics.handleFrame({
        v: 1,
        id: "msg_1",
        type: "topic.message",
        topic: "chat",
        payload: { text: "hello" },
      });

      expect(cb).toHaveBeenCalled();
    });
  });

  describe("RTC topic fanout", () => {
    it("publishes via RTC to topic peers when unreliable", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice", "bob"]);
      const topics = new Topics(conn, mockSession(), rtc);

      // Set up topic peers
      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["alice", "bob"] },
      });

      topics.publish(
        "pose",
        { x: 1, y: 2 },
        {
          delivery: { reliability: "unreliable" },
        },
      );

      expect(rtc.sendToPeer).toHaveBeenCalledTimes(2);
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "alice",
        "starfish.stream",
        expect.objectContaining({
          type: "topic.publish",
          topic: "pose",
        }),
      );
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "bob",
        "starfish.stream",
        expect.objectContaining({
          type: "topic.publish",
          topic: "pose",
        }),
      );
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("publishes via WS when reliable (default)", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const topics = new Topics(conn, mockSession(), rtc);

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "chat",
        payload: { subscribers: ["alice"] },
      });

      topics.publish("chat", { text: "hello" });

      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("falls back to WS when topic peers not connected via RTC", () => {
      const conn = mockConnection();
      const rtc = mockRTC([]); // no connected peers
      const topics = new Topics(conn, mockSession(), rtc);

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "pose",
        payload: { subscribers: ["alice"] },
      });

      topics.publish(
        "pose",
        { x: 1 },
        {
          delivery: { reliability: "unreliable" },
        },
      );

      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("publishes via RTC with preferTransport rtc", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const topics = new Topics(conn, mockSession(), rtc);

      topics.handleFrame({
        v: 1,
        id: "evt_1",
        type: "topic.peers",
        topic: "chat",
        payload: { subscribers: ["alice"] },
      });

      topics.publish(
        "chat",
        { text: "hi" },
        {
          delivery: { preferTransport: "rtc" },
        },
      );

      // topic.publish with preferTransport rtc — peers from topic peers map
      // But selectTransport for topic.publish looks at topic peers, not frame.to
      // The rtc state getTopicPeers returns ["alice"], and alice is connected
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "alice",
        "starfish.control",
        expect.objectContaining({ type: "topic.publish" }),
      );
    });
  });
});
