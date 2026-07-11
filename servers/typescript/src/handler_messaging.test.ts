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

describe("client.send", () => {
  let hub: Hub;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c1, "room1");
    joinSession(hub, c2, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("delivers client.message to target", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "m1", type: "client.send",
      session: "room1", to: c2.id,
      payload: { text: "hi" },
    });

    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("client.message");
    expect(c2.sent[0].from).toBe(c1.id);
    expect(c2.sent[0].to).toBe(c2.id);
    expect(c2.sent[0].session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hi" });
  });

  it("delivers to multiple targets", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1, id: "m1", type: "client.send",
      session: "room1", to: [c2.id, c3.id],
      payload: { text: "hi all" },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("client.message");
    expect(c3.sent).toHaveLength(1);
    expect(c3.sent[0].type).toBe("client.message");
  });

  it("returns error for nonexistent target", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "m1", type: "client.send",
      session: "room1", to: "nonexistent",
      payload: { text: "hi" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("client.not_found");
  });

  it("requires session membership", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "m1", type: "client.send",
      session: "nonexistent", to: c2.id,
      payload: {},
    });

    expect(c1.sent[0].error?.code).toBe("session.not_found");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "m1", type: "client.send",
      session: "room1", to: c2.id,
      payload: {},
    });

    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });
});

describe("session.broadcast", () => {
  let hub: Hub;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };
  let c3: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
    c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c1, "room1");
    joinSession(hub, c2, "room1");
    joinSession(hub, c3, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;
    c3.sent.length = 0;
  });

  it("broadcasts to all members except sender", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "b1", type: "session.broadcast",
      session: "room1",
      payload: { text: "hello all" },
    });

    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("session.broadcast");
    expect(c2.sent[0].from).toBe(c1.id);
    expect(c2.sent[0].session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hello all" });
    expect(c3.sent).toHaveLength(1);
    expect(c3.sent[0].type).toBe("session.broadcast");
  });

  it("includes sender when includeSelf is true", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "b1", type: "session.broadcast",
      session: "room1",
      options: { delivery: { includeSelf: true } },
      payload: { text: "echo" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("session.broadcast");
    expect(c2.sent).toHaveLength(1);
    expect(c3.sent).toHaveLength(1);
  });

  it("requires session membership", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "b1", type: "session.broadcast",
      session: "nonexistent",
      payload: {},
    });

    expect(c1.sent[0].error?.code).toBe("session.not_found");
  });
});
