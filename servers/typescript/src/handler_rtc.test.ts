import { describe, it, expect, beforeEach } from "vitest";
import type { StarfishFrame } from "./types.js";
import type { Client } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";
import { createTestHub, createTestClient, authenticate } from "./test-helpers.js";

function joinSession(hub: StarfishServer, client: Client & { sent: StarfishFrame[] }, session: string): void {
  hub.handler.dispatch(client, {
    header: {
      id: "join",
      resource: "session",
      method: "join",
      kind: "request",
      session,
    },
    payload: { create: true },
  });
  client.sent.length = 0;
}

describe("RTC relay", () => {
  let hub: StarfishServer;
  let c1: Client & { sent: StarfishFrame[] };
  let c2: Client & { sent: StarfishFrame[] };

  beforeEach(() => {
    hub = createTestHub();
    c1 = createTestClient(hub);
    authenticate(hub, c1);
    c2 = createTestClient(hub);
    authenticate(hub, c2);
    joinSession(hub, c1, "room1");
    joinSession(hub, c2, "room1");
    c1.sent.length = 0;
    c2.sent.length = 0;
  });

  const rtcMethods = ["connect", "offer", "answer", "ice"] as const;

  for (const method of rtcMethods) {
    describe(`rtc.${method}`, () => {
      it("relays to target peer with from set to sender", () => {
        hub.handler.dispatch(c1, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "room1",
            to: c2.id,
          },
          payload: { sdp: "test" },
        });

        expect(c1.sent).toHaveLength(0);
        expect(c2.sent).toHaveLength(1);
        expect(c2.sent[0].header.resource).toBe("rtc");
        expect(c2.sent[0].header.method).toBe(method);
        expect(c2.sent[0].header.kind).toBe("event");
        expect(c2.sent[0].header.from).toBe(c1.id);
        expect(c2.sent[0].header.to).toBe(c2.id);
        expect(c2.sent[0].header.session).toBe("room1");
        expect(c2.sent[0].payload).toEqual({ sdp: "test" });
      });

      it("rejects when target is not in session", () => {
        const c3 = createTestClient(hub);
        authenticate(hub, c3);
        joinSession(hub, c3, "room2");

        hub.handler.dispatch(c1, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "room1",
            to: c3.id,
          },
          payload: {},
        });

        expect(c1.sent).toHaveLength(1);
        expect((c1.sent[0].payload as any)?.error?.code).toBe("client.not_found");
      });

      it("rejects when no to field", () => {
        hub.handler.dispatch(c1, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "room1",
          },
          payload: {},
        });

        expect(c1.sent).toHaveLength(1);
        expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
      });

      it("rejects when multiple targets", () => {
        hub.handler.dispatch(c1, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "room1",
            to: [c2.id, c1.id],
          },
          payload: {},
        });

        expect(c1.sent).toHaveLength(1);
        expect((c1.sent[0].payload as any)?.error?.code).toBe("protocol.invalid_frame");
      });

      it("requires authentication", () => {
        const unauth = createTestClient(hub);
        hub.handler.dispatch(unauth, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "room1",
            to: c2.id,
          },
          payload: {},
        });

        expect((unauth.sent[0].payload as any)?.error?.code).toBe("auth.required");
      });

      it("requires session membership", () => {
        hub.handler.dispatch(c1, {
          header: {
            id: "r1",
            resource: "rtc",
            method,
            kind: "request",
            session: "nonexistent",
            to: c2.id,
          },
          payload: {},
        });

        expect((c1.sent[0].payload as any)?.error?.code).toBe("session.not_found");
      });
    });
  }

  it("overwrites from even if client sets it", () => {
    hub.handler.dispatch(c1, {
      header: {
        id: "r1",
        resource: "rtc",
        method: "offer",
        kind: "request",
        session: "room1",
        to: c2.id,
        from: "spoofed_id",
      },
      payload: { sdp: "test" },
    });

    expect(c2.sent).toHaveLength(1);
    expect(c2.sent[0].header.from).toBe(c1.id);
  });

  it("rejects RTC between clients in different sessions", () => {
    const c3 = createTestClient(hub);
    authenticate(hub, c3);
    joinSession(hub, c3, "room2");
    c3.sent.length = 0;

    hub.handler.dispatch(c1, {
      header: {
        id: "r1",
        resource: "rtc",
        method: "connect",
        kind: "request",
        session: "room1",
        to: c3.id,
      },
      payload: {},
    });

    expect(c1.sent).toHaveLength(1);
    expect((c1.sent[0].payload as any)?.error?.code).toBe("client.not_found");
    expect(c3.sent).toHaveLength(0);
  });
});
