import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient } from "../src/index.js";

describe("SDK: presence", () => {
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

  it("presence.set() sends data, observer receives via presence$", async () => {
    const session = uniqueSession();

    const setter = track("setter");
    await setter.connect();
    await setter.join(session);

    const observer = track("observer");
    await observer.connect();
    await observer.join(session);

    const updated = new Promise<Map<string, any>>((resolve) => {
      observer.presence$.subscribe((map) => {
        if (map.size > 0) resolve(map);
      });
    });

    setter.presence.set({ role: "dancer", x: 0.5, y: 0.8 });

    const presenceMap = await updated;
    expect(presenceMap.get(setter.clientId!)).toEqual({
      role: "dancer",
      x: 0.5,
      y: 0.8,
    });
  });

  it("presence.set() full-replaces previous data", async () => {
    const session = uniqueSession();

    const setter = track("setter");
    await setter.connect();
    await setter.join(session);

    const observer = track("observer");
    await observer.connect();
    await observer.join(session);

    // Collect presence updates
    let updateCount = 0;
    const secondUpdate = new Promise<Map<string, any>>((resolve) => {
      observer.presence$.subscribe((map) => {
        if (map.has(setter.clientId!)) {
          updateCount++;
          if (updateCount === 2) resolve(new Map(map));
        }
      });
    });

    setter.presence.set({ x: 1, y: 2, name: "foo" });

    // Wait briefly for first update to propagate
    await new Promise((r) => setTimeout(r, 200));

    setter.presence.set({ x: 5, y: 10 });

    const presenceMap = await secondUpdate;
    const data = presenceMap.get(setter.clientId!);
    expect(data).toEqual({ x: 5, y: 10 });
    expect(data.name).toBeUndefined();
  });
});
