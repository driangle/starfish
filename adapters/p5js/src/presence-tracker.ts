import type { Presence } from "@starfish/client";
import type { P5Instance, PeerPresence, PresenceOptions } from "./types.js";
import { getMousePosition } from "./p5-lifecycle.js";

const DEFAULT_THROTTLE_MS = 50;

export class PresenceTracker {
  private lastSendTime = 0;
  private extraData: Record<string, unknown> = {};
  private readonly throttleMs: number;
  private readonly autoTrackCursor: boolean;

  constructor(
    private readonly presence: Presence,
    private readonly p5: P5Instance | undefined,
    options?: PresenceOptions,
  ) {
    this.throttleMs = options?.throttleMs ?? DEFAULT_THROTTLE_MS;
    this.autoTrackCursor = options?.autoTrackCursor ?? true;
  }

  setData(data: Record<string, unknown>): void {
    this.extraData = data;
  }

  update(): void {
    const now = Date.now();
    if (now - this.lastSendTime < this.throttleMs) return;
    this.lastSendTime = now;

    const pos = this.autoTrackCursor ? getMousePosition(this.p5) : null;
    this.presence.set({
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      ...this.extraData,
    });
  }

  static toPeers(presenceMap: Map<string, any>, selfId: string | null): PeerPresence[] {
    const peers: PeerPresence[] = [];
    for (const [id, data] of presenceMap) {
      if (id === selfId) continue;
      peers.push({
        id,
        name: data?.name,
        x: data?.x ?? 0,
        y: data?.y ?? 0,
        data: data ?? {},
      });
    }
    return peers;
  }
}
