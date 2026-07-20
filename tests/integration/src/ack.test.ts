import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { directSendFrame, ackFrame, nackFrame } from "./helpers/frames.js";
import type { StarfishFrame } from "./helpers/types.js";
import { uniqueSession, uniqueId, SHORT_TIMEOUT } from "./helpers/setup.js";

// The Starfish v0.1 protocol treats ack/nack as client-driven, routed replies:
// a sender marks a frame with `delivery.requireAck: true`, the recipient
// responds with an `ack` (or `nack`) frame addressed back to the sender, and
// the server routes it using the `replyTo` referencing the original message id.
// The server never synthesizes acknowledgements on its own.

describe("acknowledgements", () => {
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

  // Connect a sender + receiver joined to a fresh session, returning both.
  const pair = async () => {
    const session = uniqueSession();
    const sender = await track();
    await sender.hello({ name: "sender" });
    await sender.join(session);
    const receiver = await track();
    await receiver.hello({ name: "receiver" });
    await receiver.join(session);
    return { session, sender, receiver };
  };

  it("requireAck message yields an ack routed back to the sender", async () => {
    const { session, sender, receiver } = await pair();

    const msg = directSendFrame(
      session,
      receiver.clientId!,
      { cue: "go" },
      { delivery: { requireAck: true } },
    );
    await sender.send(msg);

    // Recipient receives the message and acknowledges it.
    const delivered = await receiver.waitForType("message.message");
    expect(delivered.header.from).toBe(sender.clientId);
    await receiver.send(ackFrame(session, sender.clientId!, msg.header.id));

    const ack = await sender.waitForReply(msg.header.id);
    expect(`${ack.header.resource}.${ack.header.method}`).toBe("ack.ack");
    expect(ack.header.from).toBe(receiver.clientId);
    expect((ack.payload as any)?.status).toBe("ok");
    expect((ack.payload as any)?.received).toBe(true);
  });

  it("nack is routed back when the recipient rejects delivery", async () => {
    const { session, sender, receiver } = await pair();

    const msg = directSendFrame(
      session,
      receiver.clientId!,
      { cue: "go" },
      { delivery: { requireAck: true } },
    );
    await sender.send(msg);

    await receiver.waitForType("message.message");
    await receiver.send(
      nackFrame(session, sender.clientId!, msg.header.id, {
        code: "topic.not_subscribed",
        resource: "topic",
        message: "Receiver is not subscribed to topic.",
        retry: false,
      }),
    );

    const nack = await sender.waitForReply(msg.header.id);
    expect(`${nack.header.resource}.${nack.header.method}`).toBe("ack.nack");
    expect(nack.header.from).toBe(receiver.clientId);
    expect((nack.payload as any)?.status).toBe("error");
    expect((nack.payload as any)?.error?.code).toBe("topic.not_subscribed");
  });

  it("ack carries replyTo referencing the original message id", async () => {
    const { session, sender, receiver } = await pair();

    const msg = directSendFrame(
      session,
      receiver.clientId!,
      { cue: "go" },
      { delivery: { requireAck: true } },
    );
    await sender.send(msg);

    await receiver.waitForType("message.message");
    await receiver.send(ackFrame(session, sender.clientId!, msg.header.id));

    const ack = await sender.waitForReply(msg.header.id);
    expect(ack.header.replyTo).toBe(msg.header.id);
    expect(ack.header.from).toBe(receiver.clientId);
  });

  it("messages without requireAck produce no acknowledgement", async () => {
    const { session, sender, receiver } = await pair();

    // No requireAck: the recipient gets the message but nothing acknowledges it.
    const msg = directSendFrame(session, receiver.clientId!, { cue: "go" });
    await sender.send(msg);
    await receiver.waitForType("message.message");

    // The server must not synthesize an ack/nack back to the sender.
    await expect(
      sender.waitFor((f) => f.header.resource === "ack", SHORT_TIMEOUT),
    ).rejects.toThrow();
  });

  it("ack without replyTo is rejected as an invalid frame", async () => {
    const session = uniqueSession();
    const client = await track();
    await client.hello();
    await client.join(session);

    const bad: StarfishFrame = {
      header: {
        id: uniqueId("ack"),
        resource: "ack",
        method: "ack",
        kind: "response",
        session,
        to: client.clientId!,
      },
      payload: { status: "ok", received: true },
    };
    await client.send(bad);

    const err = await client.waitForReply(bad.header.id);
    expect((err.payload as any)?.status).toBe("error");
    expect((err.payload as any)?.error?.code).toBe("protocol.invalid_frame");
  });
});
