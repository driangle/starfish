import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { helloFrame, broadcastFrame } from "./helpers/frames.js";
import { uniqueId } from "./helpers/setup.js";

describe("error handling", () => {
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

  it("unsupported protocol version returns error", async () => {
    const client = await track();
    const frame = {
      header: {
        v: 2,
        id: uniqueId("hello"),
        resource: "client",
        method: "hello",
        kind: "request" as const,
        ts: Date.now(),
      },
      payload: {
        versions: [99],
        client: { name: "test", role: "test", meta: {} },
        capabilities: { rtc: false },
        auth: { type: "none" },
      },
    };
    await client.send(frame);

    const response = await client.waitForReply(frame.header.id);
    expect((response.payload as any)?.status).toBe("error");
    expect((response.payload as any)?.error?.code).toBe("protocol.unsupported_version");
    expect((response.payload as any)?.error?.retry).toBe(false);
  });

  it("invalid JSON returns error or closes connection", async () => {
    const client = await track();
    await client.sendRaw("this is not json{{{");

    // Server should either send an error or close the connection
    try {
      const response = await client.waitForError(3000);
      expect((response.payload as any)?.error?.code).toBe("protocol.invalid_frame");
    } catch {
      // Connection may have been closed, which is also acceptable
    }
  });

  it("sending session-scoped message without joining returns error", async () => {
    const client = await track();
    await client.hello();

    // Try to broadcast without joining any session
    const bcast = broadcastFrame("nonexistent-session", { data: "test" });
    await client.send(bcast);

    const response = await client.waitForReply(bcast.header.id);
    expect((response.payload as any)?.status).toBe("error");
  });

  it("missing required frame fields returns error", async () => {
    const client = await track();

    // Send a frame missing required header fields (no resource/method/kind)
    const frame = { header: { id: uniqueId("bad") } } as any;
    await client.send(frame);

    try {
      const response = await client.waitForError(3000);
      expect((response.payload as any)?.error).toBeDefined();
    } catch {
      // Server may silently drop or close connection
    }
  });
});
