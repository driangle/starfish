import { describe, it, expect, beforeEach } from "vitest";
import { Session } from "./session.js";
import type { StarfishFrame } from "./types.js";
import type { Client, ClientInfo } from "./client.js";
import type { Hub } from "./hub.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

// --- Session class unit tests ---

describe("Session", () => {
  it("adds and removes clients", () => {
    const hub = createTestHub();
    const c1 = createTestClient(hub);
    c1.id = "c1";
    const c2 = createTestClient(hub);
    c2.id = "c2";

    const session = new Session("room1");
    const infos = session.addClient(c1);
    expect(infos).toHaveLength(1);
    expect(infos[0].id).toBe("c1");

    const infos2 = session.addClient(c2);
    expect(infos2).toHaveLength(2);

    expect(session.hasClient("c1")).toBe(true);
    expect(session.hasClient("c2")).toBe(true);
    expect(session.hasClient("c3")).toBe(false);

    const empty = session.removeClient("c1");
    expect(empty).toBe(false);
    expect(session.hasClient("c1")).toBe(false);

    const empty2 = session.removeClient("c2");
    expect(empty2).toBe(true);
  });

  it("broadcasts to all except excluded", () => {
    const hub = createTestHub();
    const c1 = createTestClient(hub);
    c1.id = "c1";
    const c2 = createTestClient(hub);
    c2.id = "c2";

    const session = new Session("room1");
    session.addClient(c1);
    session.addClient(c2);

    const frame: StarfishFrame = { v: 1, id: "m1", type: "test" };
    session.broadcast(frame, "c1");

    expect(c1.sent).toHaveLength(0);
    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("test");
  });

  it("broadcasts to all when no exclusion", () => {
    const hub = createTestHub();
    const c1 = createTestClient(hub);
    c1.id = "c1";
    const c2 = createTestClient(hub);
    c2.id = "c2";

    const session = new Session("room1");
    session.addClient(c1);
    session.addClient(c2);

    session.broadcast({ v: 1, id: "m1", type: "test" });
    expect(c1.sent).toHaveLength(1);
    expect(c2.sent).toHaveLength(1);
  });
});

// --- session.join handler tests ---

describe("session.join", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
  });

  it("creates session with create: true", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("session.joined");
    expect(client.sent[0].session).toBe("room1");
    expect(client.sent[0].replyTo).toBe("j1");

    const payload = client.sent[0].payload as { clientId: string; clients: ClientInfo[] };
    expect(payload.clientId).toBe(client.id);
    expect(payload.clients).toHaveLength(1);
    expect(payload.clients[0].id).toBe(client.id);

    expect(client.sessions.has("room1")).toBe(true);
    expect(hub.getSession("room1")).toBeDefined();
  });

  it("rejects join without create when session does not exist", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: {},
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("session.not_found");
  });

  it("joins existing session without create flag", () => {
    const c1 = createTestClient(hub);
    authenticate(hub, c1);
    hub.handler.dispatch(c1, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(client, {
      v: 1, id: "j2", type: "session.join",
      session: "room1", payload: {},
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("session.joined");
    const payload = client.sent[0].payload as { clients: ClientInfo[] };
    expect(payload.clients).toHaveLength(2);
  });

  it("broadcasts client.connected to other members", () => {
    const c1 = createTestClient(hub);
    authenticate(hub, c1);
    hub.handler.dispatch(c1, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(client, {
      v: 1, id: "j2", type: "session.join",
      session: "room1", payload: { create: true },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("client.connected");
    expect(c1.sent[0].session).toBe("room1");
    const connPayload = c1.sent[0].payload as { client: ClientInfo };
    expect(connPayload.client.id).toBe(client.id);

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("session.joined");
  });

  it("rejects join without session field", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      payload: { create: true },
    });

    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("protocol.invalid_frame");
  });

  it("updates client identity from join payload", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1",
      payload: { create: true, name: "Alice", role: "editor", meta: { color: "red" } },
    });

    expect(client.name).toBe("Alice");
    expect(client.role).toBe("editor");
    expect(client.meta).toEqual({ color: "red" });
  });

  it("requires authentication", () => {
    const unauthClient = createTestClient(hub);
    hub.handler.dispatch(unauthClient, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });

    expect(unauthClient.sent[0].type).toBe("error");
    expect(unauthClient.sent[0].error?.code).toBe("auth.required");
  });
});

// --- session.leave handler tests ---

describe("session.leave", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    client.sent.length = 0;
  });

  it("sends session.left confirmation", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave", session: "room1",
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("session.left");
    expect(client.sent[0].session).toBe("room1");
    expect(client.sent[0].replyTo).toBe("l1");
    expect(client.sessions.has("room1")).toBe(false);
  });

  it("broadcasts client.disconnected to remaining members", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    hub.handler.dispatch(c2, {
      v: 1, id: "j2", type: "session.join",
      session: "room1", payload: {},
    });
    c2.sent.length = 0;

    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave", session: "room1",
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("client.disconnected");
    const dcPayload = c2.sent[0].payload as { clientId: string; reason: string };
    expect(dcPayload.clientId).toBe(client.id);
    expect(dcPayload.reason).toBe("left");
  });

  it("destroys session when last client leaves", () => {
    expect(hub.getSession("room1")).toBeDefined();
    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave", session: "room1",
    });
    expect(hub.getSession("room1")).toBeUndefined();
  });

  it("rejects leave when not in session", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave", session: "nonexistent",
    });
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("session.not_found");
  });

  it("rejects leave without session field", () => {
    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave",
    });
    expect(client.sent[0].type).toBe("error");
    expect(client.sent[0].error?.code).toBe("protocol.invalid_frame");
  });
});

// --- requireSession guard ---

describe("requireSession guard", () => {
  let hub: Hub;
  let client: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    client = createTestClient(hub);
    authenticate(hub, client);
  });

  it("rejects when client is not in session", () => {
    let called = false;
    hub.handler.registerAuth("test.guarded", hub.handler.requireSession(() => { called = true; }));
    hub.handler.dispatch(client, { v: 1, id: "m1", type: "test.guarded", session: "room1" });

    expect(called).toBe(false);
    expect(client.sent[0].error?.code).toBe("session.not_found");
  });

  it("allows when client is in session", () => {
    let called = false;
    hub.handler.registerAuth("test.guarded", hub.handler.requireSession(() => { called = true; }));

    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    client.sent.length = 0;

    hub.handler.dispatch(client, { v: 1, id: "m1", type: "test.guarded", session: "room1" });
    expect(called).toBe(true);
  });

  it("rejects when session field is missing", () => {
    let called = false;
    hub.handler.registerAuth("test.guarded", hub.handler.requireSession(() => { called = true; }));
    hub.handler.dispatch(client, { v: 1, id: "m1", type: "test.guarded" });

    expect(called).toBe(false);
    expect(client.sent[0].error?.code).toBe("session.not_found");
  });
});

// --- Client disconnect ---

describe("client disconnect", () => {
  it("leaves all sessions and fires events on disconnect", () => {
    const hub = createTestHub();
    const c1 = createTestClient(hub);
    authenticate(hub, c1);
    const c2 = createTestClient(hub);
    authenticate(hub, c2);

    hub.handler.dispatch(c1, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    hub.handler.dispatch(c2, {
      v: 1, id: "j2", type: "session.join",
      session: "room1", payload: {},
    });
    hub.handler.dispatch(c2, {
      v: 1, id: "j3", type: "session.join",
      session: "room2", payload: { create: true },
    });
    c1.sent.length = 0;
    c2.sent.length = 0;

    hub.handleClientDisconnect(c2);

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("client.disconnected");
    expect(c1.sent[0].session).toBe("room1");
    const dcPayload = c1.sent[0].payload as { clientId: string; reason: string };
    expect(dcPayload.clientId).toBe(c2.id);
    expect(dcPayload.reason).toBe("disconnect");

    expect(c2.sessions.size).toBe(0);
    expect(hub.getSession("room1")).toBeDefined();
    expect(hub.getSession("room2")).toBeUndefined();
  });
});

// --- Multiple sessions ---

describe("multiple sessions", () => {
  it("client can join and selectively leave sessions", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);
    authenticate(hub, client);

    hub.handler.dispatch(client, {
      v: 1, id: "j1", type: "session.join",
      session: "room1", payload: { create: true },
    });
    hub.handler.dispatch(client, {
      v: 1, id: "j2", type: "session.join",
      session: "room2", payload: { create: true },
    });

    expect(client.sessions.size).toBe(2);

    hub.handler.dispatch(client, {
      v: 1, id: "l1", type: "session.leave", session: "room1",
    });

    expect(client.sessions.size).toBe(1);
    expect(client.sessions.has("room1")).toBe(false);
    expect(client.sessions.has("room2")).toBe(true);
  });
});
