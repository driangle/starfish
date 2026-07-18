import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: StarfishServer, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    header: { id: "join", resource: "session", method: "join", kind: "request", session },
    payload: { create: true },
  });
  client.sent.length = 0;
}

describe("topic.subscribe", () => {
  let hub: StarfishServer;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
    joinSession(hub, client, "room1");
  });

  it("subscribes and receives topic.subscribed + topic.peers", () => {
    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });

    expect(client.sent).toHaveLength(2);
    expect(client.sent[0].header.resource).toBe("topic");
    expect(client.sent[0].header.method).toBe("subscribe");
    expect(client.sent[0].header.kind).toBe("response");
    expect(client.sent[0].header.topic).toBe("chat");
    expect(client.sent[0].header.session).toBe("room1");
    expect(client.sent[0].header.replyTo).toBe("s1");

    expect(client.sent[1].header.resource).toBe("topic");
    expect(client.sent[1].header.method).toBe("peers");
    expect(client.sent[1].header.kind).toBe("event");
    expect(client.sent[1].header.topic).toBe("chat");
    const peers = client.sent[1].payload as { subscribers: string[] };
    expect(peers.subscribers).toEqual([client.id]);
  });

  it("sends topic.peers to all subscribers when a new client subscribes", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");

    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });
    client.sent.length = 0;

    hub.handler.dispatch(c2, {
      header: { id: "s2", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });

    // c2 gets topic.subscribed + topic.peers
    expect(c2.sent[0].header.resource).toBe("topic");
    expect(c2.sent[0].header.method).toBe("subscribe");
    expect(c2.sent[0].header.kind).toBe("response");
    expect(c2.sent[1].header.resource).toBe("topic");
    expect(c2.sent[1].header.method).toBe("peers");
    expect(c2.sent[1].header.kind).toBe("event");
    const c2Peers = c2.sent[1].payload as { subscribers: string[] };
    expect(c2Peers.subscribers).toHaveLength(2);

    // c1 also gets topic.peers
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("topic");
    expect(client.sent[0].header.method).toBe("peers");
    expect(client.sent[0].header.kind).toBe("event");
    const c1Peers = client.sent[0].payload as { subscribers: string[] };
    expect(c1Peers.subscribers).toHaveLength(2);
  });

  it("rejects topic name exceeding 128 chars", () => {
    const longTopic = "a".repeat(129);
    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: longTopic },
    });

    expect(client.sent).toHaveLength(1);
    expect((client.sent[0].payload as any)?.status).toBe("error");
    expect((client.sent[0].payload as any)?.error?.code).toBe("topic.invalid");
  });

  it("rejects missing topic field", () => {
    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1" },
    });

    expect((client.sent[0].payload as any)?.status).toBe("error");
    expect((client.sent[0].payload as any)?.error?.code).toBe("topic.invalid");
  });

  it("rejects when not in session", () => {
    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "nonexistent", topic: "chat" },
    });

    expect((client.sent[0].payload as any)?.status).toBe("error");
    expect((client.sent[0].payload as any)?.error?.code).toBe("session.not_found");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });

    expect((unauth.sent[0].payload as any)?.status).toBe("error");
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});

describe("topic.unsubscribe", () => {
  let hub: StarfishServer;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
    joinSession(hub, client, "room1");
    hub.handler.dispatch(client, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });
    client.sent.length = 0;
  });

  it("unsubscribes and receives topic.unsubscribed", () => {
    hub.handler.dispatch(client, {
      header: { id: "u1", resource: "topic", method: "unsubscribe", kind: "request", session: "room1", topic: "chat" },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("topic");
    expect(client.sent[0].header.method).toBe("unsubscribe");
    expect(client.sent[0].header.kind).toBe("response");
    expect(client.sent[0].header.topic).toBe("chat");
    expect(client.sent[0].header.replyTo).toBe("u1");
  });

  it("updates peers for remaining subscribers", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");
    hub.handler.dispatch(c2, {
      header: { id: "s2", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });
    c2.sent.length = 0;

    hub.handler.dispatch(client, {
      header: { id: "u1", resource: "topic", method: "unsubscribe", kind: "request", session: "room1", topic: "chat" },
    });

    // c2 gets topic.peers with only itself
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("topic");
    expect(c2.sent[0].header.method).toBe("peers");
    expect(c2.sent[0].header.kind).toBe("event");
    const peers = c2.sent[0].payload as { subscribers: string[] };
    expect(peers.subscribers).toEqual([c2.id]);
  });
});

describe("topic.publish", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room1");

    c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");

    // Both subscribe to "chat"
    hub.handler.dispatch(c1, {
      header: { id: "s1", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });
    hub.handler.dispatch(c2, {
      header: { id: "s2", resource: "topic", method: "subscribe", kind: "request", session: "room1", topic: "chat" },
    });
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("delivers topic.message to all subscribers including sender", () => {
    hub.handler.dispatch(c1, {
      header: { id: "p1", resource: "topic", method: "publish", kind: "request", session: "room1", topic: "chat" },
      payload: { text: "hello" },
    });

    // c1 (sender) also receives because they are subscribed
    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.resource).toBe("topic");
    expect(c1.sent[0].header.method).toBe("message");
    expect(c1.sent[0].header.kind).toBe("event");
    expect(c1.sent[0].header.from).toBe(c1.id);

    // c2 gets topic.message
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("topic");
    expect(c2.sent[0].header.method).toBe("message");
    expect(c2.sent[0].header.kind).toBe("event");
    expect(c2.sent[0].header.topic).toBe("chat");
    expect(c2.sent[0].header.from).toBe(c1.id);
    expect(c2.sent[0].header.session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hello" });
  });

  it("publish when not subscribed delivers to subscribers without error", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c3, {
      header: { id: "p1", resource: "topic", method: "publish", kind: "request", session: "room1", topic: "chat" },
      payload: { text: "hello" },
    });

    // No error for the publisher
    expect(c3.sent.filter((f) => f.header.resource === "error")).toHaveLength(0);

    // Subscribed clients still receive the message
    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.resource).toBe("topic");
    expect(c1.sent[0].header.method).toBe("message");
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("topic");
    expect(c2.sent[0].header.method).toBe("message");
  });

  it("rejects publish with invalid topic", () => {
    hub.handler.dispatch(c1, {
      header: { id: "p1", resource: "topic", method: "publish", kind: "request", session: "room1", topic: "a".repeat(129) },
      payload: {},
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.error?.code).toBe("topic.invalid");
  });

  it("does not deliver to unsubscribed clients", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");
    // c3 is in session but not subscribed to "chat"

    hub.handler.dispatch(c1, {
      header: { id: "p1", resource: "topic", method: "publish", kind: "request", session: "room1", topic: "chat" },
      payload: { text: "hello" },
    });

    expect(c3.sent).toHaveLength(0);
  });
});
