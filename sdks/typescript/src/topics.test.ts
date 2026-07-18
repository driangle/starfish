import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topics } from "./topics.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
import type { RTC } from "./rtc.js";
import type { StarfishFrame } from "./types.js";
import { resetIdCounter } from "./id.js";

function mockConnection(): Connection {
  return { clientId: "me", send: vi.fn(), sendAndWait: vi.fn() } as unknown as Connection;
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

function subResponse() {
  return {
    header: {
      id: "resp_1",
      resource: "topic",
      method: "subscribe",
      kind: "response" as const,
      replyTo: "sub_1",
    },
    payload: { status: "ok" },
  };
}

function topicMsg(
  topic: string,
  payload: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  return {
    header: {
      id: "msg_1",
      resource: "topic",
      method: "message",
      kind: "event" as const,
      topic,
      ...extra,
    },
    payload,
  } as StarfishFrame;
}

function topicPeers(topic: string, subscribers: string[]) {
  return {
    header: { id: "evt_1", resource: "topic", method: "peers", kind: "event" as const, topic },
    payload: { subscribers },
  } as StarfishFrame;
}

describe("Topics", () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it("subscribe() sends topic.subscribe and tracks subscription", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());
    vi.mocked(conn.sendAndWait).mockResolvedValue(subResponse());

    const response = await topics.subscribe("chat");

    expect(conn.sendAndWait).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          resource: "topic",
          method: "subscribe",
          session: "room-1",
          topic: "chat",
        }),
      }),
    );
    expect(response.header.method).toBe("subscribe");
  });

  it("subscribe() with callback wires it to topic$ stream", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());
    vi.mocked(conn.sendAndWait).mockResolvedValue(subResponse());

    const callback = vi.fn();
    await topics.subscribe("chat", callback);

    const msgFrame = topicMsg("chat", { text: "hello" });
    topics.handleFrame(msgFrame);
    expect(callback).toHaveBeenCalledWith(msgFrame);
  });

  it("subscribe() throws when not in a session", async () => {
    await expect(new Topics(mockConnection(), mockSession(null)).subscribe("chat")).rejects.toThrow(
      "Not in a session",
    );
  });

  it("subscribe() validates topic name length", async () => {
    await expect(
      new Topics(mockConnection(), mockSession()).subscribe("x".repeat(200)),
    ).rejects.toThrow("exceeds 128 characters");
  });

  it("unsubscribe() sends topic.unsubscribe", async () => {
    const conn = mockConnection();
    await new Topics(conn, mockSession()).unsubscribe("chat");
    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          resource: "topic",
          method: "unsubscribe",
          session: "room-1",
          topic: "chat",
        }),
      }),
    );
  });

  it("unsubscribe() throws when not in a session", async () => {
    await expect(
      new Topics(mockConnection(), mockSession(null)).unsubscribe("chat"),
    ).rejects.toThrow("Not in a session");
  });

  it("publish() sends topic.publish with payload", () => {
    const conn = mockConnection();
    new Topics(conn, mockSession()).publish("chat", { text: "hello" });
    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({
          resource: "topic",
          method: "publish",
          session: "room-1",
          topic: "chat",
        }),
        payload: { text: "hello" },
      }),
    );
  });

  it("publish() includes frame options when provided", () => {
    const conn = mockConnection();
    new Topics(conn, mockSession()).publish("chat", { text: "hi" }, { priority: "high" });
    expect(conn.send).toHaveBeenCalledWith(
      expect.objectContaining({
        header: expect.objectContaining({ resource: "topic", method: "publish", priority: "high" }),
      }),
    );
  });

  it("publish() throws when not in a session", () => {
    expect(() => new Topics(mockConnection(), mockSession(null)).publish("chat", {})).toThrow(
      "Not in a session",
    );
  });

  it("topic$() returns the same stream for the same topic", () => {
    const topics = new Topics(mockConnection(), mockSession());
    expect(topics.topic$("chat")).toBe(topics.topic$("chat"));
  });

  it("topic$() returns different streams for different topics", () => {
    const topics = new Topics(mockConnection(), mockSession());
    expect(topics.topic$("chat")).not.toBe(topics.topic$("events"));
  });

  it("handleFrame routes topic.message to the correct stream", () => {
    const topics = new Topics(mockConnection(), mockSession());
    const chatCb = vi.fn();
    const eventsCb = vi.fn();
    topics.topic$("chat").subscribe(chatCb);
    topics.topic$("events").subscribe(eventsCb);

    const frame = topicMsg("chat", { text: "hello" });
    topics.handleFrame(frame);
    expect(chatCb).toHaveBeenCalledWith(frame);
    expect(eventsCb).not.toHaveBeenCalled();
  });

  it("handleFrame ignores messages for topics without streams", () => {
    new Topics(mockConnection(), mockSession()).handleFrame(topicMsg("unknown", {}));
  });

  it("handleFrame ignores non-topic frames", () => {
    const topics = new Topics(mockConnection(), mockSession());
    const cb = vi.fn();
    topics.topic$("chat").subscribe(cb);
    topics.handleFrame({
      header: {
        id: "msg_1",
        resource: "session",
        method: "connected",
        kind: "event",
        topic: "chat",
      },
      payload: {},
    });
    expect(cb).not.toHaveBeenCalled();
  });

  describe("topic.peers subscription map", () => {
    it("tracks subscription map from topic.peers frame", () => {
      const topics = new Topics(mockConnection(), mockSession());
      topics.handleFrame(topicPeers("pose", ["alice", "bob"]));
      expect(topics.getTopicPeers("pose")).toEqual(["alice", "bob"]);
    });

    it("replaces subscription map on subsequent topic.peers", () => {
      const topics = new Topics(mockConnection(), mockSession());
      topics.handleFrame(topicPeers("pose", ["alice", "bob"]));
      topics.handleFrame({
        ...topicPeers("pose", ["charlie"]),
        header: { ...topicPeers("pose", ["charlie"]).header, id: "evt_2" },
      });
      expect(topics.getTopicPeers("pose")).toEqual(["charlie"]);
    });

    it("returns empty array for topics without peers", () => {
      expect(new Topics(mockConnection(), mockSession()).getTopicPeers("unknown")).toEqual([]);
    });

    it("clears topic peers on unsubscribe", async () => {
      const topics = new Topics(mockConnection(), mockSession());
      topics.handleFrame(topicPeers("pose", ["alice"]));
      await topics.unsubscribe("pose");
      expect(topics.getTopicPeers("pose")).toEqual([]);
    });
  });

  describe("receiver-side validation", () => {
    it("delivers RTC topic messages for subscribed topics", async () => {
      const conn = mockConnection();
      const topics = new Topics(conn, mockSession());
      vi.mocked(conn.sendAndWait).mockResolvedValue(subResponse());

      const cb = vi.fn();
      await topics.subscribe("chat", cb);
      topics.handleFrame(topicMsg("chat", { text: "hello" }, { transport: "rtc" } as any));
      expect(cb).toHaveBeenCalled();
    });

    it("drops RTC topic messages for unsubscribed topics silently", () => {
      const topics = new Topics(mockConnection(), mockSession());
      const cb = vi.fn();
      topics.topic$("secret").subscribe(cb);
      topics.handleFrame(topicMsg("secret", { text: "unauthorized" }, { transport: "rtc" } as any));
      expect(cb).not.toHaveBeenCalled();
    });

    it("delivers WS topic messages regardless of subscription tracking", () => {
      const topics = new Topics(mockConnection(), mockSession());
      const cb = vi.fn();
      topics.topic$("chat").subscribe(cb);
      topics.handleFrame(topicMsg("chat", { text: "hello" }));
      expect(cb).toHaveBeenCalled();
    });
  });

  describe("RTC topic fanout", () => {
    it("publishes via RTC to topic peers when unreliable", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice", "bob"]);
      const topics = new Topics(conn, mockSession(), rtc);
      topics.handleFrame(topicPeers("pose", ["alice", "bob"]));

      topics.publish("pose", { x: 1, y: 2 }, { delivery: { reliability: "unreliable" } });

      expect(rtc.sendToPeer).toHaveBeenCalledTimes(2);
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "alice",
        "starfish.stream",
        expect.objectContaining({
          header: expect.objectContaining({ resource: "topic", method: "publish", topic: "pose" }),
        }),
      );
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "bob",
        "starfish.stream",
        expect.objectContaining({
          header: expect.objectContaining({ resource: "topic", method: "publish", topic: "pose" }),
        }),
      );
      expect(conn.send).not.toHaveBeenCalled();
    });

    it("publishes via WS when reliable (default)", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const topics = new Topics(conn, mockSession(), rtc);
      topics.handleFrame(topicPeers("chat", ["alice"]));

      topics.publish("chat", { text: "hello" });
      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("falls back to WS when topic peers not connected via RTC", () => {
      const conn = mockConnection();
      const rtc = mockRTC([]);
      const topics = new Topics(conn, mockSession(), rtc);
      topics.handleFrame(topicPeers("pose", ["alice"]));

      topics.publish("pose", { x: 1 }, { delivery: { reliability: "unreliable" } });
      expect(conn.send).toHaveBeenCalled();
      expect(rtc.sendToPeer).not.toHaveBeenCalled();
    });

    it("publishes via RTC with preferTransport rtc", () => {
      const conn = mockConnection();
      const rtc = mockRTC(["alice"]);
      const topics = new Topics(conn, mockSession(), rtc);
      topics.handleFrame(topicPeers("chat", ["alice"]));

      topics.publish("chat", { text: "hi" }, { delivery: { preferTransport: "rtc" } });
      expect(rtc.sendToPeer).toHaveBeenCalledWith(
        "alice",
        "starfish.control",
        expect.objectContaining({
          header: expect.objectContaining({ resource: "topic", method: "publish" }),
        }),
      );
    });
  });
});
