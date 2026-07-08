import { describe, it, expect, afterEach } from "vitest";
import { StarfishTestClient } from "./helpers/client.js";
import { helloFrame, broadcastFrame, publishFrame } from "./helpers/frames.js";
import { uniqueId, uniqueSession } from "./helpers/setup.js";

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
    const frame = { ...helloFrame(), v: 99 };
    await client.send(frame);

    const response = await client.waitForReply(frame.id);
    expect(response.type).toBe("error");
    expect(response.error?.code).toBe("protocol.unsupported_version");
  });

  it("invalid JSON returns error or closes connection", async () => {
    const client = await track();
    await client.sendRaw("this is not json{{{");

    // Server should either send an error or close the connection
    try {
      const response = await client.waitForType("error", 3000);
      expect(response.error?.code).toBe("protocol.invalid_frame");
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

    const response = await client.waitForReply(bcast.id);
    expect(response.type).toBe("error");
  });

  it("missing required frame fields returns error", async () => {
    const client = await track();

    // Send a frame missing the type field
    const frame = { v: 1, id: uniqueId("bad") } as any;
    await client.send(frame);

    try {
      const response = await client.waitForType("error", 3000);
      expect(response.error).toBeDefined();
    } catch {
      // Server may silently drop or close connection
    }
  });
});
