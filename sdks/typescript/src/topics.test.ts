import { describe, it, expect, vi, beforeEach } from "vitest";
import { Topics } from "./topics.js";
import { Session } from "./session.js";
import type { Connection } from "./connection.js";
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

    await expect(topics.subscribe("chat")).rejects.toThrow(
      "Not in a session",
    );
  });

  it("subscribe() validates topic name length", async () => {
    const conn = mockConnection();
    const topics = new Topics(conn, mockSession());
    const longName = "x".repeat(200);

    await expect(topics.subscribe(longName)).rejects.toThrow(
      "exceeds 128 characters",
    );
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

    await expect(topics.unsubscribe("chat")).rejects.toThrow(
      "Not in a session",
    );
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
});
