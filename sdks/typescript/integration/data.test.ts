import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient, DataResult } from "../src/index.js";

describe("SDK: data", () => {
  const clients: StarfishClient[] = [];
  const track = (name?: string) => {
    const c = createClient(name);
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.disconnect()));
    clients.length = 0;
  });

  it("save() and get() roundtrip with replace", async () => {
    const session = uniqueSession();
    const client = track("data-test");
    await client.connect();
    await client.join(session);

    const saved = await client.save({
      key: "score",
      scope: "session",
      op: "replace",
      data: 42,
    });

    expect(saved.key).toBe("score");
    expect(saved.data).toBe(42);
    expect(saved.version).toBeGreaterThanOrEqual(1);

    const fetched = await client.get({ key: "score", scope: "session" });
    expect(fetched.data).toBe(42);
    expect(fetched.version).toBe(saved.version);
  });

  it("save() merge does shallow merge", async () => {
    const session = uniqueSession();
    const client = track("merge-test");
    await client.connect();
    await client.join(session);

    await client.save({
      key: "config",
      scope: "session",
      op: "replace",
      data: { a: 1, b: 2 },
    });

    await client.save({
      key: "config",
      scope: "session",
      op: "merge",
      data: { b: 99, c: 3 },
    });

    const result = await client.get({ key: "config", scope: "session" });
    expect(result.data).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("save() counter.add increments", async () => {
    const session = uniqueSession();
    const client = track("counter-test");
    await client.connect();
    await client.join(session);

    await client.save({
      key: "counter",
      scope: "session",
      op: "replace",
      data: 10,
    });

    const result = await client.save({
      key: "counter",
      scope: "session",
      op: "counter.add",
      data: 5,
    });

    expect(result.data).toBe(15);
  });

  it("save() with expectedVersion succeeds on match", async () => {
    const session = uniqueSession();
    const client = track("occ-test");
    await client.connect();
    await client.join(session);

    const v1 = await client.save({
      key: "versioned",
      scope: "session",
      op: "replace",
      data: "v1",
      expectedVersion: 0,
    });
    expect(v1.version).toBe(1);

    const v2 = await client.save({
      key: "versioned",
      scope: "session",
      op: "replace",
      data: "v2",
      expectedVersion: 1,
    });
    expect(v2.version).toBe(2);
    expect(v2.data).toBe("v2");
  });

  it("save() with expectedVersion rejects on mismatch", async () => {
    const session = uniqueSession();
    const client = track("conflict-test");
    await client.connect();
    await client.join(session);

    await client.save({
      key: "conflict",
      scope: "session",
      op: "replace",
      data: "original",
    });

    await expect(
      client.save({
        key: "conflict",
        scope: "session",
        op: "replace",
        data: "bad",
        expectedVersion: 999,
      }),
    ).rejects.toThrow();
  });

  it("data.changed events arrive via changed$", async () => {
    const session = uniqueSession();

    const writer = track("writer");
    await writer.connect();
    await writer.join(session);

    const observer = track("observer");
    await observer.connect();
    await observer.join(session);

    const changed = new Promise<DataResult>((resolve) => {
      observer.changed$.subscribe(resolve);
    });

    await writer.save({
      key: "color",
      scope: "session",
      op: "replace",
      data: "blue",
    });

    const result = await changed;
    expect(result.key).toBe("color");
    expect(result.data).toBe("blue");
  });

  it("key$() filters data.changed to specific key", async () => {
    const session = uniqueSession();

    const writer = track("writer");
    await writer.connect();
    await writer.join(session);

    const observer = track("observer");
    await observer.connect();
    await observer.join(session);

    const colorChanges: DataResult[] = [];
    observer.key$("color").subscribe((r) => colorChanges.push(r));

    const scoreChanges: DataResult[] = [];
    observer.key$("score").subscribe((r) => scoreChanges.push(r));

    await writer.save({
      key: "color",
      scope: "session",
      op: "replace",
      data: "red",
    });

    await writer.save({
      key: "score",
      scope: "session",
      op: "replace",
      data: 100,
    });

    // Wait for events to propagate
    await new Promise((r) => setTimeout(r, 500));

    expect(colorChanges).toHaveLength(1);
    expect(colorChanges[0].data).toBe("red");
    expect(scoreChanges).toHaveLength(1);
    expect(scoreChanges[0].data).toBe(100);
  });
});
