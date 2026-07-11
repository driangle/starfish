import { describe, it, expect, beforeEach } from "vitest";
import { DataStore, ConflictError } from "./data_store.js";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

// --- DataStore unit tests ---

describe("DataStore", () => {
  it("replace sets and overwrites values", () => {
    const ds = new DataStore();

    const entry = ds.apply("replace", "score", "session", "c1", 42);
    expect(entry.version).toBe(1);
    expect(entry.data).toBe(42);

    const entry2 = ds.apply("replace", "score", "session", "c1", 100);
    expect(entry2.version).toBe(2);
    expect(entry2.data).toBe(100);
  });

  it("merge shallow-merges objects", () => {
    const ds = new DataStore();

    ds.apply("replace", "config", "session", "c1", { a: 1, b: 2 });
    const entry = ds.apply("merge", "config", "session", "c1", { b: 3, c: 4 });

    expect(entry.data).toEqual({ a: 1, b: 3, c: 4 });
  });

  it("merge on empty key creates object", () => {
    const ds = new DataStore();

    const entry = ds.apply("merge", "config", "session", "c1", { x: 1 });
    expect(entry.data).toEqual({ x: 1 });
  });

  it("merge rejects non-object incoming", () => {
    const ds = new DataStore();

    expect(() => ds.apply("merge", "k", "session", "c1", "string")).toThrow(
      "merge requires an object",
    );
  });

  it("counter.add accumulates numbers", () => {
    const ds = new DataStore();

    ds.apply("counter.add", "points", "session", "c1", 10);
    const entry = ds.apply("counter.add", "points", "session", "c1", 5);

    expect(entry.data).toBe(15);
  });

  it("counter.add starts from zero", () => {
    const ds = new DataStore();

    const entry = ds.apply("counter.add", "points", "session", "c1", 7);
    expect(entry.data).toBe(7);
  });

  it("counter.add rejects non-number", () => {
    const ds = new DataStore();

    expect(() =>
      ds.apply("counter.add", "k", "session", "c1", "bad"),
    ).toThrow("counter.add requires a number");
  });

  it("set.add adds unique items", () => {
    const ds = new DataStore();

    ds.apply("set.add", "tags", "session", "c1", "a");
    ds.apply("set.add", "tags", "session", "c1", "b");
    ds.apply("set.add", "tags", "session", "c1", "a"); // duplicate

    const entry = ds.get("tags", "session", "c1");
    expect(entry.data).toEqual(["a", "b"]);
    expect(entry.version).toBe(3);
  });

  it("set.remove removes matching items", () => {
    const ds = new DataStore();

    ds.apply("set.add", "tags", "session", "c1", "a");
    ds.apply("set.add", "tags", "session", "c1", "b");
    ds.apply("set.remove", "tags", "session", "c1", "a");

    const entry = ds.get("tags", "session", "c1");
    expect(entry.data).toEqual(["b"]);
  });

  it("list.add allows duplicates", () => {
    const ds = new DataStore();

    ds.apply("list.add", "log", "session", "c1", "event1");
    ds.apply("list.add", "log", "session", "c1", "event2");
    ds.apply("list.add", "log", "session", "c1", "event1"); // duplicate allowed

    const entry = ds.get("log", "session", "c1");
    expect(entry.data).toEqual(["event1", "event2", "event1"]);
  });

  it("list.remove removes all occurrences", () => {
    const ds = new DataStore();

    ds.apply("list.add", "log", "session", "c1", "event1");
    ds.apply("list.add", "log", "session", "c1", "event2");
    ds.apply("list.add", "log", "session", "c1", "event1");
    ds.apply("list.remove", "log", "session", "c1", "event1");

    const entry = ds.get("log", "session", "c1");
    expect(entry.data).toEqual(["event2"]);
  });

  it("delete removes key and increments version", () => {
    const ds = new DataStore();

    ds.apply("replace", "tmp", "session", "c1", "value");
    const entry = ds.apply("delete", "tmp", "session", "c1", undefined);

    expect(entry.version).toBe(2);

    const got = ds.get("tmp", "session", "c1");
    expect(got.version).toBe(0);
    expect(got.data).toBeUndefined();
  });

  it("optimistic concurrency succeeds with correct version", () => {
    const ds = new DataStore();

    ds.apply("replace", "x", "session", "c1", 1);
    const entry = ds.apply("replace", "x", "session", "c1", 2, 1);
    expect(entry.version).toBe(2);
    expect(entry.data).toBe(2);
  });

  it("optimistic concurrency fails with wrong version", () => {
    const ds = new DataStore();

    ds.apply("replace", "x", "session", "c1", 1);
    ds.apply("replace", "x", "session", "c1", 2, 1);

    try {
      ds.apply("replace", "x", "session", "c1", 3, 1);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConflictError);
      const conflict = err as ConflictError;
      expect(conflict.actualVersion).toBe(2);
      expect(conflict.currentData).toBe(2);
    }
  });

  it("expectedVersion 0 works for new keys", () => {
    const ds = new DataStore();

    const entry = ds.apply("replace", "new", "session", "c1", "first", 0);
    expect(entry.version).toBe(1);
  });

  it("scope isolation between self clients", () => {
    const ds = new DataStore();

    ds.apply("replace", "secret", "self", "c1", "mine");
    ds.apply("replace", "secret", "self", "c2", "yours");

    expect(ds.get("secret", "self", "c1").data).toBe("mine");
    expect(ds.get("secret", "self", "c2").data).toBe("yours");
  });

  it("scope isolation between self and session", () => {
    const ds = new DataStore();

    ds.apply("replace", "key", "self", "c1", "private");
    ds.apply("replace", "key", "session", "c1", "shared");

    expect(ds.get("key", "self", "c1").data).toBe("private");
    expect(ds.get("key", "session", "c1").data).toBe("shared");
  });

  it("get returns empty entry for missing key", () => {
    const ds = new DataStore();

    const entry = ds.get("missing", "session", "c1");
    expect(entry.version).toBe(0);
    expect(entry.data).toBeUndefined();
  });

  it("rejects invalid operation", () => {
    const ds = new DataStore();

    expect(() => ds.apply("bad.op", "k", "session", "c1", null)).toThrow(
      "invalid operation: bad.op",
    );
  });
});

// --- Handler integration tests ---

function joinSession(hub: Hub, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    v: 1,
    id: "join",
    type: "session.join",
    session,
    payload: { create: true },
  });
  client.sent.length = 0;
}

describe("data.save handler", () => {
  let hub: Hub;
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
      v: 1,
      id: "ds1",
      type: "data.save",
      session: "room",
      payload: { key: "score", scope: "session", op: "replace", data: 42 },
    });

    const saved = c1.sent.find((f) => f.type === "data.saved")!;
    expect(saved).toBeDefined();
    expect(saved.replyTo).toBe("ds1");

    const payload = saved.payload as { key: string; scope: string; data: unknown; version: number };
    expect(payload.key).toBe("score");
    expect(payload.scope).toBe("session");
    expect(payload.data).toBe(42);
    expect(payload.version).toBe(1);
  });

  it("broadcasts data.changed for session scope", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds2",
      type: "data.save",
      session: "room",
      payload: { key: "score", scope: "session", op: "replace", data: 100 },
    });

    // c1 gets data.saved, c1 + c2 get data.changed (broadcast with no exclusion)
    const c2Changed = c2.sent.filter((f) => f.type === "data.changed");
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
      v: 1,
      id: "ds3",
      type: "data.save",
      session: "room",
      payload: { key: "private", scope: "self", op: "replace", data: "mine" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("data.saved");

    const c2Changed = c2.sent.filter((f) => f.type === "data.changed");
    expect(c2Changed).toHaveLength(0);
  });

  it("returns data.conflict on version mismatch", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds4a",
      type: "data.save",
      session: "room",
      payload: { key: "x", scope: "session", op: "replace", data: 1 },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds4b",
      type: "data.save",
      session: "room",
      payload: {
        key: "x",
        scope: "session",
        op: "replace",
        data: 2,
        expectedVersion: 0,
      },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("data.conflict");

    const details = c1.sent[0].error?.details as {
      key: string; expectedVersion: number; actualVersion: number; currentData: unknown;
    };
    expect(details.key).toBe("x");
    expect(details.expectedVersion).toBe(0);
    expect(details.actualVersion).toBe(1);
    expect(details.currentData).toBe(1);
  });

  it("rejects invalid operation", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds5",
      type: "data.save",
      session: "room",
      payload: { key: "x", scope: "session", op: "bad.op", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("data.invalid_op");
  });

  it("rejects payload exceeding size limit", () => {
    const largeData = "x".repeat(256 * 1024 + 1);

    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds6",
      type: "data.save",
      session: "room",
      payload: { key: "big", scope: "session", op: "replace", data: largeData },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("payload.too_large");
  });

  it("rejects missing key", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds7",
      type: "data.save",
      session: "room",
      payload: { key: "", scope: "session", op: "replace", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("protocol.invalid_frame");
  });

  it("rejects invalid scope", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "ds8",
      type: "data.save",
      session: "room",
      payload: { key: "x", scope: "invalid", op: "replace", data: 1 },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("protocol.invalid_frame");
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1,
      id: "ds9",
      type: "data.save",
      session: "room",
      payload: { key: "x", scope: "session", op: "replace", data: 1 },
    });

    expect(unauth.sent[0].type).toBe("error");
    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });
});

describe("data.get handler", () => {
  let hub: Hub;
  let c1: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    joinSession(hub, c1, "room");
  });

  it("returns data.value for existing key", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "save1",
      type: "data.save",
      session: "room",
      payload: { key: "score", scope: "session", op: "replace", data: 42 },
    });
    c1.sent.length = 0;

    hub.handler.dispatch(c1, {
      v: 1,
      id: "get1",
      type: "data.get",
      session: "room",
      payload: { key: "score", scope: "session" },
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("data.value");
    expect(c1.sent[0].replyTo).toBe("get1");

    const payload = c1.sent[0].payload as { key: string; data: unknown; version: number };
    expect(payload.key).toBe("score");
    expect(payload.data).toBe(42);
    expect(payload.version).toBe(1);
  });

  it("returns version 0 for missing key", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "get2",
      type: "data.get",
      session: "room",
      payload: { key: "missing", scope: "session" },
    });

    const payload = c1.sent[0].payload as { data: unknown; version: number };
    expect(payload.version).toBe(0);
    expect(payload.data).toBeUndefined();
  });

  it("rejects invalid scope", () => {
    hub.handler.dispatch(c1, {
      v: 1,
      id: "get3",
      type: "data.get",
      session: "room",
      payload: { key: "x", scope: "bad" },
    });

    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("protocol.invalid_frame");
  });

  it("self scope is isolated per client", () => {
    const c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c2, "room");

    hub.handler.dispatch(c1, {
      v: 1,
      id: "s1",
      type: "data.save",
      session: "room",
      payload: { key: "secret", scope: "self", op: "replace", data: "c1data" },
    });
    c1.sent.length = 0;

    // c1 reads own self data
    hub.handler.dispatch(c1, {
      v: 1,
      id: "g1",
      type: "data.get",
      session: "room",
      payload: { key: "secret", scope: "self" },
    });
    const c1Payload = c1.sent[0].payload as { data: unknown };
    expect(c1Payload.data).toBe("c1data");

    // c2 reads own self data (empty)
    hub.handler.dispatch(c2, {
      v: 1,
      id: "g2",
      type: "data.get",
      session: "room",
      payload: { key: "secret", scope: "self" },
    });
    const c2Frames = c2.sent.filter((f) => f.type === "data.value");
    const c2Payload = c2Frames[0].payload as { data: unknown; version: number };
    expect(c2Payload.data).toBeUndefined();
    expect(c2Payload.version).toBe(0);
  });
});
