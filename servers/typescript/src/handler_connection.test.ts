import { describe, it, expect } from "vitest";
import type { StarfishFrame } from "./types.js";
import { createTestHub, createTestClient } from "./test-helpers.js";

describe("client.hello meta size limit", () => {
  it("rejects client meta exceeding 16KB", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    const largeMeta = "x".repeat(17 * 1024);
    hub.handler.dispatch(client, {
      header: {
        id: "m1",
        resource: "client",
        method: "hello",
        kind: "request",
      },
      payload: { versions: [2], client: { name: "Alice", meta: largeMeta } },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].payload?.status).toBe("error");
    expect(
      (client.sent[0].payload?.error as { code: string })?.code,
    ).toBe("payload.too_large");
    expect(client.authenticated).toBe(false);
  });

  it("accepts client meta within limit", () => {
    const hub = createTestHub();
    const client = createTestClient(hub);

    const okMeta = "x".repeat(1024);
    hub.handler.dispatch(client, {
      header: {
        id: "m1",
        resource: "client",
        method: "hello",
        kind: "request",
      },
      payload: { versions: [2], client: { name: "Alice", meta: okMeta } },
    });

    expect(client.sent).toHaveLength(1);
    expect(client.sent[0].header.resource).toBe("client");
    expect(client.sent[0].header.method).toBe("welcome");
    expect(client.sent[0].header.kind).toBe("response");
    expect(client.sent[0].payload?.status).toBe("ok");
    expect(client.sent[0].payload?.version).toBe(2);
    expect(client.authenticated).toBe(true);
  });
});
