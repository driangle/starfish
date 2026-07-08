import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { presenceFrame } from "./helpers/frames.js";
import { uniqueSession } from "./helpers/setup.js";

describe("presence", () => {
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

  it("presence.set triggers presence.updated broadcast", async () => {
    const session = uniqueSession();

    const setter = await track();
    await setter.hello({ name: "setter" });
    await setter.join(session);

    const observer = await track();
    await observer.hello({ name: "observer" });
    await observer.join(session);

    // Drain client.connected
    await setter.drain(300);

    const pres = presenceFrame(session, {
      role: "dancer",
      color: "red",
      x: 0.4,
      y: 0.8,
    });
    await setter.send(pres);

    const updated = await observer.waitForType("presence.updated");
    expect(updated.session).toBe(session);
    expect(updated.from).toBe(setter.clientId);
    expect(updated.payload).toEqual({
      role: "dancer",
      color: "red",
      x: 0.4,
      y: 0.8,
    });
  });

  it("presence.set is full-replace (overwrites previous)", async () => {
    const session = uniqueSession();

    const setter = await track();
    await setter.hello({ name: "setter" });
    await setter.join(session);

    const observer = await track();
    await observer.hello({ name: "observer" });
    await observer.join(session);

    // Drain client.connected
    await setter.drain(300);

    // Set initial presence
    await setter.send(presenceFrame(session, { x: 1, y: 2, name: "foo" }));
    const first = await observer.waitForType("presence.updated");
    expect(first.payload).toEqual({ x: 1, y: 2, name: "foo" });

    // Set new presence — should fully replace, not merge
    await setter.send(presenceFrame(session, { x: 5, y: 10 }));
    const second = await observer.waitForType("presence.updated");
    expect(second.payload).toEqual({ x: 5, y: 10 });
    // "name" field should NOT be present (full replace, not merge)
    expect(second.payload.name).toBeUndefined();
  });
});
