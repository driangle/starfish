import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { Hub } from "./hub.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

describe("clock.sync", () => {
  let hub: Hub;
  let c: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c = createTestClient(hub);
    authenticate(hub, c);
  });

  it("returns clock.synced with serverTime", () => {
    hub.handler.dispatch(c, {
      v: 1, id: "cs1", type: "clock.sync",
    });

    expect(c.sent).toHaveLength(1);
    expect(c.sent[0].type).toBe("clock.synced");
    expect(c.sent[0].replyTo).toBe("cs1");
    const payload = c.sent[0].payload as { serverTime: number };
    expect(typeof payload.serverTime).toBe("number");
    expect(c.sent[0].ts).toBe(payload.serverTime);
  });

  it("does not require authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "cs2", type: "clock.sync",
    });

    expect(unauth.sent[0].type).toBe("clock.synced");
  });
});

describe("ack", () => {
  let hub: Hub;
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
      v: 1, id: "ack1", type: "ack",
      replyTo: "msg_1", to: c2.id,
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("ack");
    expect(c2.sent[0].from).toBe(c1.id);
    expect(c2.sent[0].replyTo).toBe("msg_1");
  });

  it("routes ack to multiple targets", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);

    hub.handler.dispatch(c1, {
      v: 1, id: "ack2", type: "ack",
      replyTo: "msg_2", to: [c2.id, c3.id],
    });

    expect(c2.sent).toHaveLength(1);
    expect(c3.sent).toHaveLength(1);
  });

  it("returns error without replyTo", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "ack3", type: "ack",
      to: c2.id,
    });

    expect(c1.sent).toHaveLength(1);
    expect(c1.sent[0].type).toBe("error");
    expect(c1.sent[0].error?.code).toBe("protocol.invalid_frame");
  });

  it("silently ignores missing targets", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "ack4", type: "ack",
      replyTo: "msg_1", to: "nonexistent",
    });

    // No error, no crash
    expect(c1.sent).toHaveLength(0);
  });

  it("silently handles no targets", () => {
    hub.handler.dispatch(c1, {
      v: 1, id: "ack5", type: "ack",
      replyTo: "msg_1",
    });

    expect(c1.sent).toHaveLength(0);
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "ack6", type: "ack",
      replyTo: "msg_1", to: c2.id,
    });

    expect(unauth.sent[0].type).toBe("error");
    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });
});

describe("nack", () => {
  let hub: Hub;
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
      v: 1, id: "nack1", type: "nack",
      replyTo: "msg_1", to: c2.id,
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].type).toBe("nack");
    expect(c2.sent[0].from).toBe(c1.id);
  });

  it("requires authentication", () => {
    const unauth = createTestClient(hub);
    hub.handler.dispatch(unauth, {
      v: 1, id: "nack2", type: "nack",
      replyTo: "msg_1", to: c2.id,
    });

    expect(unauth.sent[0].type).toBe("error");
    expect(unauth.sent[0].error?.code).toBe("auth.required");
  });
});
