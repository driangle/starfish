import { describe, it, expect } from "vitest";
import { DataStore, ConflictError } from "./data_store.js";

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

