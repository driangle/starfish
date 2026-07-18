import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: StarfishServer, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    header: {
      id: "join",
      resource: "session",
      method: "join",
      kind: "request",
      session,
    },
    payload: { create: true },
  });
  client.sent.length = 0;
}

describe("data.save handler", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c1, "room");
    joinSession(hub, c2, "room");
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  it("saves data and returns data.saved", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds1",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "score", scope: "session", op: "replace", data: 42 },
    });

    const saved = c1.sent.find(
      (f) => f.header.resource === "data" && f.header.method === "save" && f.header.kind === "response",
    )!;
    expect(saved).toBeDefined();
    expect(saved.header.replyTo).toBe("ds1");

    const payload = saved.payload as { key: string; scope: string; data: unknown; version: number };
    expect(payload.key).toBe("score");
    expect(payload.scope).toBe("session");
    expect(payload.data).toBe(42);
    expect(payload.version).toBe(1);
  });

  it("broadcasts data.changed for session scope", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds2",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "score", scope: "session", op: "replace", data: 100 },
    });

    const c2Changed = c2.sent.filter(
      (f) => f.header.resource === "data" && f.header.method === "changed" && f.header.kind === "event",
    );
    expect(c2Changed).toHaveLength(1);

    const changedPayload = c2Changed[0].payload as {
      key: string; op: string; data: unknown; version: number; updatedBy: string;
    };
    expect(changedPayload.key).toBe("score");
    expect(changedPayload.op).toBe("replace");
    expect(changedPayload.data).toBe(100);
    expect(changedPayload.version).toBe(1);
    expect(changedPayload.updatedBy).toBe(c1.id);
  });

  it("does not broadcast for self scope", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds3",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "private", scope: "self", op: "replace", data: "mine" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.resource).toBe("data");
    expect(c1.sent[0].header.method).toBe("save");
    expect(c1.sent[0].header.kind).toBe("response");

    const c2Changed = c2.sent.filter(
      (f) => f.header.resource === "data" && f.header.method === "changed",
    );
    expect(c2Changed).toHaveLength(0);
  });

  it("returns data.conflict on version mismatch", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds4a",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "session", op: "replace", data: 1 },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: {
        id: "ds4b",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "session", op: "replace", data: 2, expectedVersion: 0 },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.kind).toBe("response");
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("data.conflict");

    const details = (c1.sent[0].payload as any)?.details as {
      key: string; expectedVersion: number; actualVersion: number; currentData: unknown;
    };
    expect(details.key).toBe("x");
    expect(details.expectedVersion).toBe(0);
    expect(details.actualVersion).toBe(1);
    expect(details.currentData).toBe(1);
  });

  it("rejects invalid operation", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds5",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "session", op: "bad.op", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("data.invalid_op");
  });

  it("rejects payload exceeding size limit", () => {
    const largeData = "x".repeat(256 * 1024 + 1);
    hub.handler.dispatch(c1, {
      header: {
        id: "ds6",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "big", scope: "session", op: "replace", data: largeData },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("payload.too_large");
  });

  it("rejects missing key", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds7",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "", scope: "session", op: "replace", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
  });

  it("rejects invalid scope", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ds8",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "invalid", op: "replace", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: {
        id: "ds9",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "session", op: "replace", data: 1 },
    });

    expect((unauth.sent[0].payload as any)?.status).toBe("error");
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});

describe("data.get handler", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room");
  });

  it("returns data.value for existing key", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "save1",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "score", scope: "session", op: "replace", data: 42 },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: {
        id: "get1",
        resource: "data",
        method: "get",
        kind: "request",
        session: "room",
      },
      payload: { key: "score", scope: "session" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].header.resource).toBe("data");
    expect(c1.sent[0].header.method).toBe("get");
    expect(c1.sent[0].header.kind).toBe("response");
    expect(c1.sent[0].header.replyTo).toBe("get1");

    const payload = c1.sent[0].payload as { key: string; data: unknown; version: number };
    expect(payload.key).toBe("score");
    expect(payload.data).toBe(42);
    expect(payload.version).toBe(1);
  });

  it("returns version 0 for missing key", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "get2",
        resource: "data",
        method: "get",
        kind: "request",
        session: "room",
      },
      payload: { key: "missing", scope: "session" },
    });

    const payload = c1.sent[0].payload as { data: unknown; version: number };
    expect(payload.version).toBe(0);
    expect(payload.data).toBeNull();
  });

  it("rejects invalid scope", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "get3",
        resource: "data",
        method: "get",
        kind: "request",
        session: "room",
      },
      payload: { key: "x", scope: "bad" },
    });

    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
  });

  it("self scope is isolated per client", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room");

    hub.handler.dispatch(c1, {
      header: {
        id: "s1",
        resource: "data",
        method: "save",
        kind: "request",
        session: "room",
      },
      payload: { key: "secret", scope: "self", op: "replace", data: "c1data" },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: {
        id: "g1",
        resource: "data",
        method: "get",
        kind: "request",
        session: "room",
      },
      payload: { key: "secret", scope: "self" },
    });
    const c1Payload = c1.sent[0].payload as { data: unknown };
    expect(c1Payload.data).toBe("c1data");

    hub.handler.dispatch(c2, {
      header: {
        id: "g2",
        resource: "data",
        method: "get",
        kind: "request",
        session: "room",
      },
      payload: { key: "secret", scope: "self" },
    });
    const c2Frames = c2.sent.filter(
      (f) => f.header.resource === "data" && f.header.method === "get" && f.header.kind === "response",
    );
    const c2Payload = c2Frames[0].payload as { data: unknown; version: number };
    expect(c2Payload.data).toBeNull();
    expect(c2Payload.version).toBe(0);
  });
});
