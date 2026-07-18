import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { subscribeFrame, unsubscribeFrame, publishFrame } from "./helpers/frames.js";
import { uniqueSession, SHORT_TIMEOUT } from "./helpers/setup.js";

describe("topics", () => {
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

  it("subscribe returns topic.subscribed", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    const sub = subscribeFrame(session, "lights");
    await client.send(sub);
    const subscribed = await client.waitForReply(sub.header.id);

    expect(subscribed.header.resource).toBe("topic");
    expect(subscribed.header.method).toBe("subscribe");
    expect(subscribed.header.session).toBe(session);
    expect(subscribed.header.topic).toBe("lights");
  });

  it("publish delivers topic.message to subscriber", async () => {
    const session = uniqueSession();

    const subscriber = await track();
    await subscriber.hello({ name: "subscriber" });
    await subscriber.join(session);
    const sub = subscribeFrame(session, "lights");
    await subscriber.send(sub);
    await subscriber.waitForReply(sub.header.id);

    const publisher = await track();
    await publisher.hello({ name: "publisher" });
    await publisher.join(session);
    // Drain session.connected events
    await subscriber.waitForType("session.connected");

    const pub = publishFrame(session, "lights", { cue: "blackout" });
    await publisher.send(pub);

    const message = await subscriber.waitForType("topic.message");
    expect(message.header.session).toBe(session);
    expect(message.header.topic).toBe("lights");
    expect(message.header.from).toBe(publisher.clientId);
    expect(message.payload).toEqual({ cue: "blackout" });
  });

  it("publisher does NOT receive own message when not subscribed", async () => {
    const session = uniqueSession();

    const subscriber = await track();
    await subscriber.hello({ name: "subscriber" });
    await subscriber.join(session);
    const sub = subscribeFrame(session, "lights");
    await subscriber.send(sub);
    await subscriber.waitForReply(sub.header.id);

    const publisher = await track();
    await publisher.hello({ name: "publisher" });
    await publisher.join(session);
    await subscriber.waitForType("session.connected");

    const pub = publishFrame(session, "lights", { cue: "go" });
    await publisher.send(pub);

    // Subscriber should get it
    await subscriber.waitForType("topic.message");

    // Publisher should NOT get it
    await expect(publisher.waitForType("topic.message", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("publisher receives own message when also subscribed", async () => {
    const session = uniqueSession();

    // Two clients: publisher (also subscribed) and another subscriber
    const publisher = await track();
    await publisher.hello({ name: "pub-sub" });
    await publisher.join(session);

    const other = await track();
    await other.hello({ name: "other" });
    await other.join(session);

    // Publisher subscribes to the topic
    const sub = subscribeFrame(session, "lights");
    await publisher.send(sub);
    await publisher.waitForReply(sub.header.id);

    // Other also subscribes
    const sub2 = subscribeFrame(session, "lights");
    await other.send(sub2);
    await other.waitForReply(sub2.header.id);

    // Drain any topic.peers / session.connected events
    await publisher.drain(300);
    await other.drain(300);

    // Publisher publishes
    const pub = publishFrame(session, "lights", { cue: "flash" });
    await publisher.send(pub);

    // Other subscriber receives it
    const otherMsg = await other.waitForType("topic.message");
    expect(otherMsg.header.topic).toBe("lights");
    expect(otherMsg.payload).toEqual({ cue: "flash" });

    // Per spec: publisher who is also subscribed SHOULD receive own message
    // Note: some server implementations may skip self-delivery
    const selfMsg = await publisher.waitForType("topic.message");
    expect(selfMsg.header.topic).toBe("lights");
    expect(selfMsg.payload).toEqual({ cue: "flash" });
  });

  it("unsubscribe stops delivery", async () => {
    const session = uniqueSession();

    const subscriber = await track();
    await subscriber.hello({ name: "subscriber" });
    await subscriber.join(session);
    const sub = subscribeFrame(session, "lights");
    await subscriber.send(sub);
    await subscriber.waitForReply(sub.header.id);

    // Unsubscribe
    const unsub = unsubscribeFrame(session, "lights");
    await subscriber.send(unsub);
    await subscriber.waitForReply(unsub.header.id);

    const publisher = await track();
    await publisher.hello({ name: "publisher" });
    await publisher.join(session);

    const pub = publishFrame(session, "lights", { cue: "go" });
    await publisher.send(pub);

    // Subscriber should NOT receive it anymore
    await expect(subscriber.waitForType("topic.message", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("topic.peers sent after subscription", async () => {
    const session = uniqueSession();

    const client1 = await track();
    await client1.hello({ name: "peer1" });
    await client1.join(session);

    const sub1 = subscribeFrame(session, "music");
    await client1.send(sub1);
    await client1.waitForReply(sub1.header.id);

    // Client1 gets topic.peers with just itself after subscribing
    const initialPeers = await client1.waitForType("topic.peers");
    expect(initialPeers.payload?.subscribers).toContain(client1.clientId);

    // Second client subscribes — both should get updated topic.peers
    const client2 = await track();
    await client2.hello({ name: "peer2" });
    await client2.join(session);

    // Drain session.connected event on client1
    await client1.drain(200);

    const sub2 = subscribeFrame(session, "music");
    await client2.send(sub2);
    await client2.waitForReply(sub2.header.id);

    // Client1 should receive updated topic.peers with both subscribers
    const updatedPeers = await client1.waitForType("topic.peers");
    expect(updatedPeers.header.topic).toBe("music");
    expect(updatedPeers.payload?.subscribers).toBeDefined();
    expect(Array.isArray(updatedPeers.payload?.subscribers)).toBe(true);
    expect(updatedPeers.payload?.subscribers).toContain(client1.clientId);
    expect(updatedPeers.payload?.subscribers).toContain(client2.clientId);
  });

  it("publish with no subscribers does not error", async () => {
    const session = uniqueSession();

    const client = await track();
    await client.hello();
    await client.join(session);

    const pub = publishFrame(session, "empty-topic", { data: "test" });
    await client.send(pub);

    // Should not receive an error or any message
    await expect(client.waitForError(SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("multiple subscribers all receive published message", async () => {
    const session = uniqueSession();

    const sub1 = await track();
    await sub1.hello({ name: "sub1" });
    await sub1.join(session);
    const s1 = subscribeFrame(session, "events");
    await sub1.send(s1);
    await sub1.waitForReply(s1.header.id);

    const sub2 = await track();
    await sub2.hello({ name: "sub2" });
    await sub2.join(session);
    const s2 = subscribeFrame(session, "events");
    await sub2.send(s2);
    await sub2.waitForReply(s2.header.id);

    // Drain session.connected events
    await sub1.drain(300);

    const publisher = await track();
    await publisher.hello({ name: "pub" });
    await publisher.join(session);

    const pub = publishFrame(session, "events", { action: "fire" });
    await publisher.send(pub);

    const [msg1, msg2] = await Promise.all([
      sub1.waitForType("topic.message"),
      sub2.waitForType("topic.message"),
    ]);

    expect(msg1.payload).toEqual({ action: "fire" });
    expect(msg2.payload).toEqual({ action: "fire" });
  });
});
