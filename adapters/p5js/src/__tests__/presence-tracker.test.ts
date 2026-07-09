import { describe, it, expect, vi, beforeEach } from "vitest";
import { PresenceTracker } from "../presence-tracker.js";
import type { P5Instance, PeerPresence } from "../types.js";

function mockPresence() {
  return { set: vi.fn(), clear: vi.fn() } as any;
}

function mockP5(x = 100, y = 200): P5Instance {
  return { mouseX: x, mouseY: y };
}

describe("PresenceTracker", () => {
  describe("update", () => {
    it("sends cursor position from p5 instance", () => {
      const presence = mockPresence();
      const tracker = new PresenceTracker(presence, mockP5(50, 75), { throttleMs: 0 });

      tracker.update();

      expect(presence.set).toHaveBeenCalledWith({ x: 50, y: 75 });
    });

    it("includes extra data set via setData", () => {
      const presence = mockPresence();
      const tracker = new PresenceTracker(presence, mockP5(10, 20), { throttleMs: 0 });

      tracker.setData({ color: "red" });
      tracker.update();

      expect(presence.set).toHaveBeenCalledWith({ x: 10, y: 20, color: "red" });
    });

    it("throttles updates", () => {
      const presence = mockPresence();
      const tracker = new PresenceTracker(presence, mockP5(), { throttleMs: 1000 });

      tracker.update();
      tracker.update();
      tracker.update();

      expect(presence.set).toHaveBeenCalledTimes(1);
    });

    it("skips cursor tracking when autoTrackCursor is false", () => {
      const presence = mockPresence();
      const tracker = new PresenceTracker(presence, mockP5(50, 75), {
        autoTrackCursor: false,
        throttleMs: 0,
      });

      tracker.setData({ status: "active" });
      tracker.update();

      expect(presence.set).toHaveBeenCalledWith({ x: 0, y: 0, status: "active" });
    });
  });

  describe("toPeers", () => {
    it("converts presence map to PeerPresence array excluding self", () => {
      const map = new Map<string, any>([
        ["self-id", { x: 0, y: 0 }],
        ["peer-1", { x: 10, y: 20, name: "Alice" }],
        ["peer-2", { x: 30, y: 40 }],
      ]);

      const peers = PresenceTracker.toPeers(map, "self-id");

      expect(peers).toHaveLength(2);
      expect(peers[0]).toEqual({ id: "peer-1", name: "Alice", x: 10, y: 20, data: { x: 10, y: 20, name: "Alice" } });
      expect(peers[1]).toEqual({ id: "peer-2", name: undefined, x: 30, y: 40, data: { x: 30, y: 40 } });
    });

    it("returns empty array when only self present", () => {
      const map = new Map([["self-id", { x: 0, y: 0 }]]);
      expect(PresenceTracker.toPeers(map, "self-id")).toEqual([]);
    });
  });
});
