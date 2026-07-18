import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { broadcastFrame } from "./helpers/frames.js";
import { uniqueSession, SHORT_TIMEOUT } from "./helpers/setup.js";

describe("broadcast", () => {
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

  it("broadcast delivers to all except sender", async () => {
    const session = uniqueSession();

    const sender = await track();
    await sender.hello({ name: "sender" });
    await sender.join(session);

    const recv1 = await track();
    await recv1.hello({ name: "recv1" });
    await recv1.join(session);

    const recv2 = await track();
    await recv2.hello({ name: "recv2" });
    await recv2.join(session);

    // Drain session.connected events
    await sender.drain(300);

    const bcast = broadcastFrame(session, { cue: "start" });
    await sender.send(bcast);

    const [m1, m2] = await Promise.all([
      recv1.waitForType("session.broadcast"),
      recv2.waitForType("session.broadcast"),
    ]);

    expect(m1.payload).toEqual({ cue: "start" });
    expect(m2.payload).toEqual({ cue: "start" });
    expect(m1.header.from).toBe(sender.clientId);

    // Sender should NOT receive it
    await expect(sender.waitForType("session.broadcast", SHORT_TIMEOUT)).rejects.toThrow();
  });

  it("broadcast with includeSelf delivers to sender too", async () => {
    const session = uniqueSession();

    const sender = await track();
    await sender.hello({ name: "sender" });
    await sender.join(session);

    const receiver = await track();
    await receiver.hello({ name: "receiver" });
    await receiver.join(session);

    // Drain session.connected
    await sender.drain(300);

    const bcast = broadcastFrame(session, { cue: "go" }, { includeSelf: true });
    await sender.send(bcast);

    const [senderMsg, receiverMsg] = await Promise.all([
      sender.waitForType("session.broadcast"),
      receiver.waitForType("session.broadcast"),
    ]);

    expect(senderMsg.payload).toEqual({ cue: "go" });
    expect(receiverMsg.payload).toEqual({ cue: "go" });
  });
});
