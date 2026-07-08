import { describe, it, expect, afterEach } from "vitest";
import { createClient, uniqueSession } from "./setup.js";
import type { StarfishClient, StarfishFrame } from "../src/index.js";

describe("SDK: messaging", () => {
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

  it("send() delivers a direct message to the target", async () => {
    const session = uniqueSession();

    const sender = track("sender");
    await sender.connect();
    await sender.join(session);

    const receiver = track("receiver");
    await receiver.connect();
    await receiver.join(session);

    const received = new Promise<StarfishFrame>((resolve) => {
      receiver.on((frame) => {
        if (frame.type === "client.message") resolve(frame);
      });
    });

    sender.send(receiver.clientId!, { gesture: "wave" });

    const message = await received;
    expect(message.from).toBe(sender.clientId);
    expect(message.payload).toEqual({ gesture: "wave" });
  });

  it("send() to multiple recipients delivers to all", async () => {
    const session = uniqueSession();

    const sender = track("sender");
    await sender.connect();
    await sender.join(session);

    const recv1 = track("recv1");
    await recv1.connect();
    await recv1.join(session);

    const recv2 = track("recv2");
    await recv2.connect();
    await recv2.join(session);

    const p1 = new Promise<StarfishFrame>((resolve) => {
      recv1.on((f) => {
        if (f.type === "client.message") resolve(f);
      });
    });
    const p2 = new Promise<StarfishFrame>((resolve) => {
      recv2.on((f) => {
        if (f.type === "client.message") resolve(f);
      });
    });

    sender.send([recv1.clientId!, recv2.clientId!], { command: "stop" });

    const [m1, m2] = await Promise.all([p1, p2]);
    expect(m1.payload).toEqual({ command: "stop" });
    expect(m2.payload).toEqual({ command: "stop" });
  });

  it("broadcast() delivers to all session clients", async () => {
    const session = uniqueSession();

    const broadcaster = track("broadcaster");
    await broadcaster.connect();
    await broadcaster.join(session);

    const listener = track("listener");
    await listener.connect();
    await listener.join(session);

    const received = new Promise<StarfishFrame>((resolve) => {
      listener.on((frame) => {
        if (frame.type === "session.broadcast") resolve(frame);
      });
    });

    broadcaster.broadcast({ alert: "go" });

    const message = await received;
    expect(message.from).toBe(broadcaster.clientId);
    expect(message.payload).toEqual({ alert: "go" });
  });

  it("broadcast() with includeSelf delivers to sender too", async () => {
    const session = uniqueSession();

    const client = track("self-bcast");
    await client.connect();
    await client.join(session);

    const received = new Promise<StarfishFrame>((resolve) => {
      client.on((frame) => {
        if (frame.type === "session.broadcast") resolve(frame);
      });
    });

    client.broadcast({ echo: true }, { includeSelf: true });

    const message = await received;
    expect(message.payload).toEqual({ echo: true });
  });
});
