import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient, StarfishFrame } from "../src/index.js";

describe("SDK: topics", () => {
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

  it("subscribe() returns topic.subscribed confirmation", async () => {
    const session = uniqueSession();
    const client = track("subscriber");
    await client.connect();
    await client.join(session);

    const response = await client.subscribe("lights");

    expect(response.type).toBe("topic.subscribed");
  });

  it("topic$() receives published messages", async () => {
    const session = uniqueSession();

    const subscriber = track("subscriber");
    await subscriber.connect();
    await subscriber.join(session);
    await subscriber.subscribe("lights");

    const publisher = track("publisher");
    await publisher.connect();
    await publisher.join(session);

    const received = new Promise<StarfishFrame>((resolve) => {
      subscriber.topic$("lights").subscribe(resolve);
    });

    publisher.publish("lights", { cue: "blackout" });

    const message = await received;
    expect(message.topic).toBe("lights");
    expect(message.payload).toEqual({ cue: "blackout" });
    expect(message.from).toBe(publisher.clientId);
  });

  it("subscribe() with callback receives messages", async () => {
    const session = uniqueSession();

    const subscriber = track("subscriber");
    await subscriber.connect();
    await subscriber.join(session);

    const received = new Promise<StarfishFrame>((resolve) => {
      subscriber.subscribe("events", resolve);
    });

    const publisher = track("publisher");
    await publisher.connect();
    await publisher.join(session);

    publisher.publish("events", { action: "fire" });

    const message = await received;
    expect(message.payload).toEqual({ action: "fire" });
  });

  it("unsubscribe() stops message delivery", async () => {
    const session = uniqueSession();

    const subscriber = track("subscriber");
    await subscriber.connect();
    await subscriber.join(session);
    await subscriber.subscribe("lights");
    await subscriber.unsubscribe("lights");

    const publisher = track("publisher");
    await publisher.connect();
    await publisher.join(session);

    const messages: StarfishFrame[] = [];
    subscriber.topic$("lights").subscribe((f) => messages.push(f));

    publisher.publish("lights", { cue: "go" });

    // Wait a bit to confirm no messages arrive
    await new Promise((r) => setTimeout(r, 500));
    expect(messages).toHaveLength(0);
  });

  it("multiple subscribers all receive the message", async () => {
    const session = uniqueSession();

    const sub1 = track("sub1");
    await sub1.connect();
    await sub1.join(session);
    await sub1.subscribe("events");

    const sub2 = track("sub2");
    await sub2.connect();
    await sub2.join(session);
    await sub2.subscribe("events");

    const publisher = track("publisher");
    await publisher.connect();
    await publisher.join(session);

    const p1 = new Promise<StarfishFrame>((resolve) => {
      sub1.topic$("events").subscribe(resolve);
    });
    const p2 = new Promise<StarfishFrame>((resolve) => {
      sub2.topic$("events").subscribe(resolve);
    });

    publisher.publish("events", { action: "go" });

    const [msg1, msg2] = await Promise.all([p1, p2]);
    expect(msg1.payload).toEqual({ action: "go" });
    expect(msg2.payload).toEqual({ action: "go" });
  });
});
