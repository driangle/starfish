import { describe, it, expect } from "vitest";
import type { StarfishFrame } from "./types.js";
import { createTestHub, createTestClient } from "./test-helpers.js";

describe("client.hello meta size limit", () => {
  it("rejects client meta exceeding 16KB", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    const largeMeta = "x".repeat(17 * 1024);
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: { client: { name: "Alice", meta: largeMeta } },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].error?.code).toBe("payload.too_large");
    expect(client.authenticated).toBe(false);
  });

  it("accepts client meta within limit", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    const okMeta = "x".repeat(1024);
    hub.handler.dispatch(client, {
      v: 1,
      id: "m1",
      type: "client.hello",
      payload: { client: { name: "Alice", meta: okMeta } },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].type).toBe("server.welcome");
    expect(client.authenticated).toBe(true);
  });
});
