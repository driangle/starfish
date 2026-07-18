import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { dataSaveFrame, dataGetFrame } from "./helpers/frames.js";
import { uniqueSession, SHORT_TIMEOUT } from "./helpers/setup.js";

describe("shared data", () => {
  const clients: StarfishTestClient[] = [];
  const track = async () => {
    const c = await StarfishTestClient.connect();
    clients.push(c);
    return c;
  };

  afterEach(async () => {
    await Promise.all(clients.map((c) => c.close()));
    clients.length = 0;
  });

  it("data.save replace returns data.saved with version", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    const save = dataSaveFrame(session, "score", {
      scope: "session",
      op: "replace",
      data: 42,
    });
    await client.send(save);

    const saved = await client.waitForReply(save.header.id);
    expect(saved.header.resource).toBe("data");
    expect(saved.header.method).toBe("save");
    expect(saved.payload?.key).toBe("score");
    expect(saved.payload?.data).toBe(42);
    expect(saved.payload?.version).toBeDefined();
    expect(typeof saved.payload?.version).toBe("number");
    expect(saved.payload?.version).toBeGreaterThanOrEqual(1);
  });

  it("data.save triggers data.changed broadcast to other clients", async () => {
    const session = uniqueSession();

    const writer = await track();
    await writer.hello({ name: "writer" });
    await writer.join(session);

    const observer = await track();
    await observer.hello({ name: "observer" });
    await observer.join(session);

    // Drain events
    await writer.drain(300);

    const save = dataSaveFrame(session, "color", {
      scope: "session",
      op: "replace",
      data: "blue",
    });
    await writer.send(save);

    const changed = await observer.waitForType("data.changed");
    expect(changed.header.session).toBe(session);
    expect(changed.payload?.key).toBe("color");
    expect(changed.payload?.data).toBe("blue");
    expect(changed.payload?.scope).toBe("session");
    expect(changed.payload?.op).toBe("replace");
    expect(changed.payload?.version).toBeDefined();
    expect(changed.payload?.updatedBy).toBe(writer.clientId);
  });

  it("data.get returns data.value", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Save first
    const save = dataSaveFrame(session, "name", {
      scope: "session",
      op: "replace",
      data: "starfish",
    });
    await client.send(save);
    await client.waitForReply(save.header.id);

    // Get
    const get = dataGetFrame(session, "name", "session");
    await client.send(get);
    const value = await client.waitForReply(get.header.id);

    expect(value.header.resource).toBe("data");
    expect(value.header.method).toBe("get");
    expect(value.payload?.key).toBe("name");
    expect(value.payload?.data).toBe("starfish");
    expect(value.payload?.version).toBeDefined();
  });

  it("data.save merge does shallow merge", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Initial replace
    const save1 = dataSaveFrame(session, "config", {
      scope: "session",
      op: "replace",
      data: { a: 1, b: 2 },
    });
    await client.send(save1);
    await client.waitForReply(save1.header.id);

    // Merge
    const save2 = dataSaveFrame(session, "config", {
      scope: "session",
      op: "merge",
      data: { b: 99, c: 3 },
    });
    await client.send(save2);
    await client.waitForReply(save2.header.id);

    // Verify merged result
    const get = dataGetFrame(session, "config", "session");
    await client.send(get);
    const value = await client.waitForReply(get.header.id);

    expect(value.payload?.data).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("data.save counter.add increments value", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Initial value
    const save1 = dataSaveFrame(session, "counter", {
      scope: "session",
      op: "replace",
      data: 10,
    });
    await client.send(save1);
    await client.waitForReply(save1.header.id);

    // Add to counter
    const save2 = dataSaveFrame(session, "counter", {
      scope: "session",
      op: "counter.add",
      data: 5,
    });
    await client.send(save2);
    const saved = await client.waitForReply(save2.header.id);
    expect(saved.payload?.data).toBe(15);
  });

  it("data.save set.add and set.remove", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Add to set
    const add1 = dataSaveFrame(session, "tags", {
      scope: "session",
      op: "set.add",
      data: "red",
    });
    await client.send(add1);
    await client.waitForReply(add1.header.id);

    const add2 = dataSaveFrame(session, "tags", {
      scope: "session",
      op: "set.add",
      data: "blue",
    });
    await client.send(add2);
    await client.waitForReply(add2.header.id);

    // Verify
    const get1 = dataGetFrame(session, "tags", "session");
    await client.send(get1);
    const val1 = await client.waitForReply(get1.header.id);
    expect(val1.payload?.data).toContain("red");
    expect(val1.payload?.data).toContain("blue");

    // Remove from set
    const rm = dataSaveFrame(session, "tags", {
      scope: "session",
      op: "set.remove",
      data: "red",
    });
    await client.send(rm);
    await client.waitForReply(rm.header.id);

    const get2 = dataGetFrame(session, "tags", "session");
    await client.send(get2);
    const val2 = await client.waitForReply(get2.header.id);
    expect(val2.payload?.data).toContain("blue");
    expect(val2.payload?.data).not.toContain("red");
  });

  it("data.save list.add and list.remove", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Add to list
    const add1 = dataSaveFrame(session, "queue", {
      scope: "session",
      op: "list.add",
      data: "first",
    });
    await client.send(add1);
    await client.waitForReply(add1.header.id);

    const add2 = dataSaveFrame(session, "queue", {
      scope: "session",
      op: "list.add",
      data: "second",
    });
    await client.send(add2);
    await client.waitForReply(add2.header.id);

    // Verify order
    const get1 = dataGetFrame(session, "queue", "session");
    await client.send(get1);
    const val1 = await client.waitForReply(get1.header.id);
    expect(val1.payload?.data).toEqual(["first", "second"]);

    // Remove
    const rm = dataSaveFrame(session, "queue", {
      scope: "session",
      op: "list.remove",
      data: "first",
    });
    await client.send(rm);
    await client.waitForReply(rm.header.id);

    const get2 = dataGetFrame(session, "queue", "session");
    await client.send(get2);
    const val2 = await client.waitForReply(get2.header.id);
    expect(val2.payload?.data).toEqual(["second"]);
  });

  it("data.save delete removes key", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Create key
    const save = dataSaveFrame(session, "temp", {
      scope: "session",
      op: "replace",
      data: "exists",
    });
    await client.send(save);
    await client.waitForReply(save.header.id);

    // Delete it
    const del = dataSaveFrame(session, "temp", {
      scope: "session",
      op: "delete",
    });
    await client.send(del);
    await client.waitForReply(del.header.id);

    // Get should return null/empty
    const get = dataGetFrame(session, "temp", "session");
    await client.send(get);
    const value = await client.waitForReply(get.header.id);
    expect(value.payload?.data).toBeNull();
  });

  it("optimistic concurrency succeeds when version matches", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Create with version 0 (new key)
    const save1 = dataSaveFrame(session, "versioned", {
      scope: "session",
      op: "replace",
      data: "v1",
      expectedVersion: 0,
    });
    await client.send(save1);
    const saved1 = await client.waitForReply(save1.header.id);
    expect(saved1.header.resource).toBe("data");
    expect(saved1.header.method).toBe("save");
    expect(saved1.payload?.version).toBe(1);

    // Update with correct version
    const save2 = dataSaveFrame(session, "versioned", {
      scope: "session",
      op: "replace",
      data: "v2",
      expectedVersion: 1,
    });
    await client.send(save2);
    const saved2 = await client.waitForReply(save2.header.id);
    expect(saved2.header.resource).toBe("data");
    expect(saved2.header.method).toBe("save");
    expect(saved2.payload?.version).toBe(2);
    expect(saved2.payload?.data).toBe("v2");
  });

  it("optimistic concurrency fails with version mismatch", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    // Create
    const save1 = dataSaveFrame(session, "conflict-key", {
      scope: "session",
      op: "replace",
      data: "original",
    });
    await client.send(save1);
    const saved1 = await client.waitForReply(save1.header.id);
    const currentVersion = saved1.payload?.version;

    // Try to update with wrong version
    const save2 = dataSaveFrame(session, "conflict-key", {
      scope: "session",
      op: "replace",
      data: "conflict",
      expectedVersion: (currentVersion as number) + 100,
    });
    await client.send(save2);
    const error = await client.waitForReply(save2.header.id);

    expect((error.payload as any)?.status).toBe("error");
    expect((error.payload as any)?.error?.code).toBe("data.conflict");
    expect((error.payload as any)?.error?.retry).toBe(true);
    expect((error.payload as any)?.details?.expectedVersion).toBe((currentVersion as number) + 100);
    expect((error.payload as any)?.details?.actualVersion).toBe(currentVersion);
    expect((error.payload as any)?.details?.currentData).toBe("original");
  });

  it("self-scoped data is not readable by other clients", async () => {
    const session = uniqueSession();

    const writer = await track();
    await writer.hello({ name: "writer" });
    await writer.join(session);

    // Save to self scope
    const save = dataSaveFrame(session, "secret", {
      scope: "self",
      op: "replace",
      data: "private-data",
    });
    await writer.send(save);
    await writer.waitForReply(save.header.id);

    // Other client should not see data.changed for self-scoped data
    const reader = await track();
    await reader.hello({ name: "reader" });
    await reader.join(session);

    // Reader tries to get self-scoped key from writer — should get null or error
    const get = dataGetFrame(session, "secret", "self");
    await reader.send(get);
    const value = await reader.waitForReply(get.header.id);

    // Self-scoped data belongs to the requesting client, not the writer
    // Reader's own "secret" key should be null/empty since they never wrote it
    expect(value.payload?.data).toBeNull();
  });
});
