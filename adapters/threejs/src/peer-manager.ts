import type { Peer, PeerCallbacks } from "./types.js";

export class PeerManager {
  private tracked = new Map<string, Peer>();

  constructor(private readonly callbacks: PeerCallbacks) {}

  update(presenceMap: Map<string, any>, selfId: string | null): Peer[] {
    const currentIds = new Set<string>();

    for (const [id, data] of presenceMap) {
      if (id === selfId) continue;
      currentIds.add(id);

      const existing = this.tracked.get(id);
      const peer: Peer = { id, name: data?.name, presence: data ?? {} };

      if (!existing) {
        this.tracked.set(id, peer);
        this.callbacks.onJoin?.(peer);
      } else {
        this.tracked.set(id, peer);
        this.callbacks.onUpdate?.(peer);
      }
    }

    for (const [id, peer] of this.tracked) {
      if (!currentIds.has(id)) {
        this.tracked.delete(id);
        this.callbacks.onLeave?.(peer);
      }
    }

    return Array.from(this.tracked.values());
  }

  dispose(): void {
    for (const peer of this.tracked.values()) {
      this.callbacks.onLeave?.(peer);
    }
    this.tracked.clear();
  }
}
