import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { directSendFrame } from "./helpers/frames.js";
import { uniqueSession, SHORT_TIMEOUT } from "./helpers/setup.js";

describe("direct messaging", () => {
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

  it("client.send delivers client.message to target", async () => {
    const session = uniqueSession();

    const sender = await track();
    await sender.hello({ name: "sender" });
    await sender.join(session);

    const receiver = await track();
    await receiver.hello({ name: "receiver" });
    await receiver.join(session);

    const msg = directSendFrame(session, receiver.clientId!, {
      gesture: "freeze",
    });
    await sender.send(msg);

    const received = await receiver.waitForType("message.message");
    expect(received.header.session).toBe(session);
    expect(received.header.from).toBe(sender.clientId);
    expect(received.payload).toEqual({ gesture: "freeze" });
  });

  it("client.send to array of targets delivers to all", async () => {
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

    const msg = directSendFrame(session, [recv1.clientId!, recv2.clientId!], {
      command: "stop",
    });
    await sender.send(msg);

    const [m1, m2] = await Promise.all([
      recv1.waitForType("message.message"),
      recv2.waitForType("message.message"),
    ]);

    expect(m1.payload).toEqual({ command: "stop" });
    expect(m2.payload).toEqual({ command: "stop" });
    expect(m1.header.from).toBe(sender.clientId);
    expect(m2.header.from).toBe(sender.clientId);
  });

  it("client.send to non-existent client returns error", async () => {
    const session = uniqueSession();

    const client = await track();
    await client.hello();
    await client.join(session);

    const msg = directSendFrame(session, "nonexistent_client_id", {
      data: "test",
    });
    await client.send(msg);

    const error = await client.waitForReply(msg.header.id);
    expect((error.payload as any)?.status).toBe("error");
    expect((error.payload as any)?.error?.code).toBe("client.not_found");
  });

  it("sender does not receive its own direct message", async () => {
    const session = uniqueSession();

    const sender = await track();
    await sender.hello({ name: "sender" });
    await sender.join(session);

    const receiver = await track();
    await receiver.hello({ name: "receiver" });
    await receiver.join(session);

    const msg = directSendFrame(session, receiver.clientId!, { data: "test" });
    await sender.send(msg);

    await receiver.waitForType("message.message");

    // Sender should NOT receive message.message
    await expect(sender.waitForType("message.message", SHORT_TIMEOUT)).rejects.toThrow();
  });
});
