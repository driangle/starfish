import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: Hub, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    v: 1, id: "join", type: "session.join",
    session, payload: { create: true },
  });
  client.sent.length = 0;
}

describe("topic.subscribe", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
    joinSession(hub, client, "room1");
  });

  it("subscribes and receives topic.subscribed + topic.peers", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });

    expect(client.sent).toHaveLength(2);
    expect(client.sent[0].type).toBe("topic.subscribed");
    expect(client.sent[0].topic).toBe("chat");
    expect(client.sent[0].session).toBe("room1");
    expect(client.sent[0].replyTo).toBe("s1");

    expect(client.sent[1].type).toBe("topic.peers");
    expect(client.sent[1].topic).toBe("chat");
    const peers = client.sent[1].payload as { subscribers: string[] };
    expect(peers.subscribers).toEqual([client.id]);
  });

  it("sends topic.peers to all subscribers when a new client subscribes", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");

    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });
    client.sent.length = 0;

    hub.handler.dispatch(c2, {
      v: 1, id: "s2", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });

    // c2 gets topic.subscribed + topic.peers
    expect(c2.sent[0].type).toBe("topic.subscribed");
    expect(c2.sent[1].type).toBe("topic.peers");
    const c2Peers = c2.sent[1].payload as { subscribers: string[] };
    expect(c2Peers.subscribers).toHaveLength(2);

    // c1 also gets topic.peers
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("topic.peers");
    const c1Peers = client.sent[0].payload as { subscribers: string[] };
    expect(c1Peers.subscribers).toHaveLength(2);
  });

  it("rejects topic name exceeding 128 chars", () => {
    const longTopic = "a".repeat(129);
    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: longTopic,
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("topic.invalid");
  });

  it("rejects missing topic field", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1",
    });

    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("topic.invalid");
  });

  it("rejects when not in session", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "nonexistent", topic: "chat",
    });

    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("session.not_found");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });

    expect(unauth.sent[0].type).toBe("error");
    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });
});

describe("topic.unsubscribe", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
    joinSession(hub, client, "room1");
    hub.handler.dispatch(client, {
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });
    client.sent.length = 0;
  });

  it("unsubscribes and receives topic.unsubscribed", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "u1", type: "topic.unsubscribe",
      session: "room1", topic: "chat",
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("topic.unsubscribed");
    expect(client.sent[0].topic).toBe("chat");
    expect(client.sent[0].replyTo).toBe("u1");
  });

  it("updates peers for remaining subscribers", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room1");
    hub.handler.dispatch(c2, {
      v: 1, id: "s2", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });
    c2.sent.length = 0;

    hub.handler.dispatch(client, {
      v: 1, id: "u1", type: "topic.unsubscribe",
      session: "room1", topic: "chat",
    });

    // c2 gets topic.peers with only itself
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("topic.peers");
    const peers = c2.sent[0].payload as { subscribers: string[] };
    expect(peers.subscribers).toEqual([c2.id]);
  });
});

describe("topic.publish", () => {
  let hub: Hub;
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
      v: 1, id: "s1", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });
    hub.handler.dispatch(c2, {
      v: 1, id: "s2", type: "topic.subscribe",
      session: "room1", topic: "chat",
    });
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("delivers topic.message to subscribers except sender", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "topic.publish",
      session: "room1", topic: "chat",
      payload: { text: "hello" },
    });

    // c1 (sender) gets nothing
    expect(c1.sent).toHaveLength(0);

    // c2 gets topic.message
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("topic.message");
    expect(c2.sent[0].topic).toBe("chat");
    expect(c2.sent[0].from).toBe(c1.id);
    expect(c2.sent[0].session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hello" });
  });

  it("rejects publish when not subscribed", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");

    hub.handler.dispatch(c3, {
      v: 1, id: "p1", type: "topic.publish",
      session: "room1", topic: "chat",
      payload: { text: "hello" },
    });

    expect(c3.sent).toHaveLength(1);
    expect(c3.sent[0].type).toBe("error");
    expect(c3.sent[0].error?.code).toBe("topic.not_subscribed");
  });

  it("rejects publish with invalid topic", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "topic.publish",
      session: "room1", topic: "a".repeat(129),
      payload: {},
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].error?.code).toBe("topic.invalid");
  });

  it("does not deliver to unsubscribed clients", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");
    // c3 is in session but not subscribed to "chat"

    hub.handler.dispatch(c1, {
      v: 1, id: "p1", type: "topic.publish",
      session: "room1", topic: "chat",
      payload: { text: "hello" },
    });

    expect(c3.sent).toHaveLength(0);
  });
});
