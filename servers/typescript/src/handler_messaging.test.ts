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

describe("client.send", () => {
  let hub: StarfishServer;
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
      header: { id: "m1", resource: "message", method: "send", kind: "request", session: "room1", to: c2.id },
      payload: { text: "hi" },
    });

    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("message");
    expect(c2.sent[0].header.method).toBe("message");
    expect(c2.sent[0].header.kind).toBe("event");
    expect(c2.sent[0].header.from).toBe(c1.id);
    expect(c2.sent[0].header.to).toBe(c2.id);
    expect(c2.sent[0].header.session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hi" });
  });

  it("delivers to multiple targets", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: { id: "m1", resource: "message", method: "send", kind: "request", session: "room1", to: [c2.id, c3.id] },
      payload: { text: "hi all" },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("message");
    expect(c2.sent[0].header.method).toBe("message");
    expect(c3.sent).toHaveLength(1);
    expect(c3.sent[0].header.resource).toBe("message");
    expect(c3.sent[0].header.method).toBe("message");
  });

  it("returns error for nonexistent target", () => {
    hub.handler.dispatch(c1, {
      header: { id: "m1", resource: "message", method: "send", kind: "request", session: "room1", to: "nonexistent" },
      payload: { text: "hi" },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("client.not_found");
  });

  it("requires session membership", () => {
    hub.handler.dispatch(c1, {
      header: { id: "m1", resource: "message", method: "send", kind: "request", session: "nonexistent", to: c2.id },
      payload: {},
    });

    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("session.not_found");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: { id: "m1", resource: "message", method: "send", kind: "request", session: "room1", to: c2.id },
      payload: {},
    });

    expect((unauth.sent[0].payload as any)?.status).toBe("error");
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});

describe("session.broadcast", () => {
  let hub: StarfishServer;
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
      header: { id: "b1", resource: "session", method: "broadcast", kind: "request", session: "room1" },
      payload: { text: "hello all" },
    });

    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("session");
    expect(c2.sent[0].header.method).toBe("broadcast");
    expect(c2.sent[0].header.kind).toBe("event");
    expect(c2.sent[0].header.from).toBe(c1.id);
    expect(c2.sent[0].header.session).toBe("room1");
    expect(c2.sent[0].payload).toEqual({ text: "hello all" });
    expect(c3.sent).toHaveLength(1);
    expect(c3.sent[0].header.resource).toBe("session");
    expect(c3.sent[0].header.method).toBe("broadcast");
  });

  it("includes sender when includeSelf is true", () => {
    hub.handler.dispatch(c1, {
      header: { id: "b1", resource: "session", method: "broadcast", kind: "request", session: "room1", delivery: { includeSelf: true } },
      payload: { text: "echo" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.resource).toBe("session");
    expect(c1.sent[0].header.method).toBe("broadcast");
    expect(c2.sent).toHaveLength(1);
    expect(c3.sent).toHaveLength(1);
  });

  it("requires session membership", () => {
    hub.handler.dispatch(c1, {
      header: { id: "b1", resource: "session", method: "broadcast", kind: "request", session: "nonexistent" },
      payload: {},
    });

    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("session.not_found");
  });
});
