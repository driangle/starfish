import { describe, it, expect, vi, beforeEach } from "vitest";
import { PeerManager } from "../peer-manager.js";
import type { PeerCallbacks } from "../types.js";

describe("PeerManager", () => {
  let callbacks: Required<PeerCallbacks>;
  let manager: PeerManager;

  beforeEach(() => {
    callbacks = {
      onJoin: vi.fn(),
      onUpdate: vi.fn(),
      onLeave: vi.fn(),
    };
    manager = new PeerManager(callbacks);
  });

  describe("update", () => {
    it("calls onJoin for new peers", () => {
      const map = new Map([["peer-1", { x: 1, name: "Alice" }]]);
      manager.update(map, "self");

      expect(callbacks.onJoin).toHaveBeenCalledWith({
        id: "peer-1",
        name: "Alice",
        presence: { x: 1, name: "Alice" },
      });
    });

    it("excludes self from peers", () => {
      const map = new Map([
        ["self", { x: 0 }],
        ["peer-1", { x: 1 }],
      ]);
      const peers = manager.update(map, "self");

      expect(peers).toHaveLength(1);
      expect(peers[0].id).toBe("peer-1");
    });

    it("calls onUpdate when presence changes", () => {
      const map1 = new Map([["peer-1", { x: 1 }]]);
      manager.update(map1, "self");

      const map2 = new Map([["peer-1", { x: 2 }]]);
      manager.update(map2, "self");

      expect(callbacks.onUpdate).toHaveBeenCalledWith({
        id: "peer-1",
        name: undefined,
        presence: { x: 2 },
      });
    });

    it("calls onLeave when peer disappears", () => {
      const map1 = new Map([["peer-1", { x: 1 }]]);
      manager.update(map1, "self");

      manager.update(new Map(), "self");

      expect(callbacks.onLeave).toHaveBeenCalledWith({
        id: "peer-1",
        name: undefined,
        presence: { x: 1 },
      });
    });

    it("returns current peer list", () => {
      const map = new Map([
        ["peer-1", { x: 1 }],
        ["peer-2", { x: 2 }],
      ]);
      const peers = manager.update(map, "self");

      expect(peers).toHaveLength(2);
      expect(peers.map((p) => p.id).sort()).toEqual(["peer-1", "peer-2"]);
    });
  });

  describe("dispose", () => {
    it("calls onLeave for all tracked peers", () => {
      const map = new Map([
        ["peer-1", { x: 1 }],
        ["peer-2", { x: 2 }],
      ]);
      manager.update(map, "self");

      manager.dispose();

      expect(callbacks.onLeave).toHaveBeenCalledTimes(2);
    });

    it("clears tracked peers", () => {
      const map = new Map([["peer-1", { x: 1 }]]);
      manager.update(map, "self");

      manager.dispose();

      const peers = manager.update(new Map([["peer-1", { x: 1 }]]), "self");
      expect(callbacks.onJoin).toHaveBeenCalledTimes(2);
      expect(peers).toHaveLength(1);
    });
  });
});
