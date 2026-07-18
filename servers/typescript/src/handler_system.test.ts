import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

describe("clock.sync", () => {
  let hub: StarfishServer;
  let c: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c = createTestClient(hub);
    authenticate(hub, c);
  });

  it("returns clock.synced with serverTime", () => {
    hub.handler.dispatch(c, {
      header: {
        id: "cs1",
        resource: "clock",
        method: "sync",
        kind: "request",
      },
    });

    expect(c.sent).toHaveLength(1);
    expect(c.sent[0].header.resource).toBe("clock");
    expect(c.sent[0].header.method).toBe("sync");
    expect(c.sent[0].header.kind).toBe("response");
    expect(c.sent[0].header.replyTo).toBe("cs1");
    const payload = c.sent[0].payload as { serverTime: number };
    expect(typeof payload.serverTime).toBe("number");
  });

  it("does not require authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: {
        id: "cs2",
        resource: "clock",
        method: "sync",
        kind: "request",
      },
    });

    expect(unauth.sent[0].header.resource).toBe("clock");
    expect(unauth.sent[0].header.method).toBe("sync");
    expect(unauth.sent[0].header.kind).toBe("response");
  });
});

describe("ack", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
  });

  it("routes ack to target client", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ack1",
        resource: "ack",
        method: "ack",
        kind: "request",
        replyTo: "msg_1",
        to: c2.id,
      },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("ack");
    expect(c2.sent[0].header.method).toBe("ack");
    expect(c2.sent[0].header.from).toBe(c1.id);
    expect(c2.sent[0].header.replyTo).toBe("msg_1");
  });

  it("routes ack to multiple targets", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);

    hub.handler.dispatch(c1, {
      header: {
        id: "ack2",
        resource: "ack",
        method: "ack",
        kind: "request",
        replyTo: "msg_2",
        to: [c2.id, c3.id],
      },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c3.sent).toHaveLength(1);
  });

  it("returns error without replyTo", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ack3",
        resource: "ack",
        method: "ack",
        kind: "request",
        to: c2.id,
      },
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.status).toBe("error");
    expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
  });

  it("silently ignores missing targets", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ack4",
        resource: "ack",
        method: "ack",
        kind: "request",
        replyTo: "msg_1",
        to: "nonexistent",
      },
    });

    // No error, no crash
    expect(c1.sent).toHaveLength(0);
  });

  it("silently handles no targets", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "ack5",
        resource: "ack",
        method: "ack",
        kind: "request",
        replyTo: "msg_1",
      },
    });

    expect(c1.sent).toHaveLength(0);
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: {
        id: "ack6",
        resource: "ack",
        method: "ack",
        kind: "request",
        replyTo: "msg_1",
        to: c2.id,
      },
    });

    expect((unauth.sent[0].payload as any)?.status).toBe("error");
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});

describe("nack", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
  });

  it("routes nack to target client", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "nack1",
        resource: "ack",
        method: "nack",
        kind: "request",
        replyTo: "msg_1",
        to: c2.id,
      },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.resource).toBe("ack");
    expect(c2.sent[0].header.method).toBe("nack");
    expect(c2.sent[0].header.from).toBe(c1.id);
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      header: {
        id: "nack2",
        resource: "ack",
        method: "nack",
        kind: "request",
        replyTo: "msg_1",
        to: c2.id,
      },
    });

    expect((unauth.sent[0].payload as any)?.status).toBe("error");
    expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
  });
});
