import { describe, it, expect } from "vitest";
import { selectTransport, type RTCState } from "./transport.js";
import type { StarfishFrame, StarfishHeader, DeliveryOptions } from "./types.js";

function frame(overrides: Partial<StarfishHeader> = {}): StarfishFrame {
  return {
    header: {
      id: "test_1",
      resource: "message",
      method: "send",
      kind: "request",
      ...overrides,
    },
  };
}

function mockRTCState(
  connected: string[] = [],
  topicPeers: Record<string, string[]> = {},
): RTCState {
  const connectedSet = new Set(connected);
  return {
    isPeerConnected: (id) => connectedSet.has(id),
    getConnectedPeerIds: () => connected,
    getTopicPeers: (topic) => topicPeers[topic] ?? [],
  };
}

describe("selectTransport", () => {
  describe('preferTransport: "ws"', () => {
    it("always returns ws regardless of RTC availability", () => {
      const delivery: DeliveryOptions = { preferTransport: "ws" };
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(frame({ to: "alice" }), delivery, rtc);
      expect(result).toEqual({ transport: "ws" });
    });

    it("returns ws even with no RTC state", () => {
      const delivery: DeliveryOptions = { preferTransport: "ws" };
      const result = selectTransport(frame(), delivery, null);
      expect(result).toEqual({ transport: "ws" });
    });
  });

  describe('preferTransport: "rtc"', () => {
    it("returns rtc when peer is connected", () => {
      const delivery: DeliveryOptions = { preferTransport: "rtc" };
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(frame({ to: "alice" }), delivery, rtc);
      expect(result).toEqual({ transport: "rtc", peers: ["alice"] });
    });

    it("falls back to ws when peer not connected and fallback is true", () => {
      const delivery: DeliveryOptions = {
        preferTransport: "rtc",
        fallback: true,
      };
      const rtc = mockRTCState([]);
      const result = selectTransport(frame({ to: "alice" }), delivery, rtc);
      expect(result).toEqual({ transport: "ws" });
    });

    it("falls back to ws by default when peer not connected (fallback defaults to true)", () => {
      const delivery: DeliveryOptions = { preferTransport: "rtc" };
      const rtc = mockRTCState([]);
      const result = selectTransport(frame({ to: "alice" }), delivery, rtc);
      expect(result).toEqual({ transport: "ws" });
    });

    it("throws transport.unavailable when fallback is false and no RTC", () => {
      const delivery: DeliveryOptions = {
        preferTransport: "rtc",
        fallback: false,
      };
      const rtc = mockRTCState([]);
      expect(() => selectTransport(frame({ to: "alice" }), delivery, rtc)).toThrow();

      try {
        selectTransport(frame({ to: "alice" }), delivery, rtc);
      } catch (e: any) {
        expect(e.code).toBe("TRANSPORT_UNAVAILABLE");
      }
    });

    it("throws transport.unavailable when RTC state is null and fallback is false", () => {
      const delivery: DeliveryOptions = {
        preferTransport: "rtc",
        fallback: false,
      };
      expect(() => selectTransport(frame({ to: "alice" }), delivery, null)).toThrow();
    });

    it("routes to multiple connected peers", () => {
      const delivery: DeliveryOptions = { preferTransport: "rtc" };
      const rtc = mockRTCState(["alice", "bob"]);
      const result = selectTransport(frame({ to: ["alice", "bob", "charlie"] }), delivery, rtc);
      expect(result).toEqual({
        transport: "rtc",
        peers: ["alice", "bob"],
      });
    });
  });

  describe('preferTransport: "auto"', () => {
    it("routes data.* to ws", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "data", method: "save", to: "alice" }),
        undefined,
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes session.* to ws", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "session", method: "broadcast" }),
        undefined,
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes presence.* to ws", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "presence", method: "set" }),
        undefined,
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes topic.publish (reliable) to ws", () => {
      const rtc = mockRTCState(["alice"], { chat: ["alice"] });
      const result = selectTransport(
        frame({ resource: "topic", method: "publish", topic: "chat" }),
        { reliability: "reliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes topic.publish (unreliable) to rtc when topic peers exist", () => {
      const rtc = mockRTCState(["alice"], { pose: ["alice"] });
      const result = selectTransport(
        frame({ resource: "topic", method: "publish", topic: "pose" }),
        { reliability: "unreliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "rtc", peers: ["alice"] });
    });

    it("routes topic.publish (unreliable) to ws when no topic peers connected", () => {
      const rtc = mockRTCState([], { pose: ["alice"] });
      const result = selectTransport(
        frame({ resource: "topic", method: "publish", topic: "pose" }),
        { reliability: "unreliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes topic.publish (latest) to rtc when topic peers exist", () => {
      const rtc = mockRTCState(["bob"], { cursor: ["bob"] });
      const result = selectTransport(
        frame({ resource: "topic", method: "publish", topic: "cursor" }),
        { reliability: "latest" },
        rtc,
      );
      expect(result).toEqual({ transport: "rtc", peers: ["bob"] });
    });

    it("routes message.send (reliable) to rtc when peer connected", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        { reliability: "reliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "rtc", peers: ["alice"] });
    });

    it("routes message.send (reliable) to ws when peer not connected", () => {
      const rtc = mockRTCState([]);
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        { reliability: "reliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("routes message.send (unreliable) to rtc when peer connected", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        { reliability: "unreliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "rtc", peers: ["alice"] });
    });

    it("routes message.send (unreliable) to ws when peer not connected", () => {
      const rtc = mockRTCState([]);
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        { reliability: "unreliable" },
        rtc,
      );
      expect(result).toEqual({ transport: "ws" });
    });

    it("defaults to auto when no delivery options", () => {
      const rtc = mockRTCState(["alice"]);
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        undefined,
        rtc,
      );
      // message.send reliable (default) → RTC if connected
      expect(result).toEqual({ transport: "rtc", peers: ["alice"] });
    });

    it("defaults to ws when no RTC state", () => {
      const result = selectTransport(
        frame({ resource: "message", method: "send", to: "alice" }),
        undefined,
        null,
      );
      expect(result).toEqual({ transport: "ws" });
    });
  });
});
