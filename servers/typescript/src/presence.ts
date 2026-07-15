import type { Session } from "./session.js";
import type { StarfishServer } from "./starfish_server.js";

const PRESENCE_THROTTLE_MS = 50;

/**
 * Batches presence updates and broadcasts at a fixed rate (50ms).
 * Latest value per client wins — rapid updates coalesce.
 */
export class PresenceThrottle {
  private pending = new Map<string, unknown>();
  private session: Session;
  private hub: StarfishServer;
  private timer: ReturnType<typeof setInterval>;

  constructor(session: Session, hub: StarfishServer) {
    this.session = session;
    this.hub = hub;
    this.timer = setInterval(() => this.flush(), PRESENCE_THROTTLE_MS);
  }

  set(clientId: string, payload: unknown): void {
    this.pending.set(clientId, payload);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  flush(): void {
    if (this.pending.size === 0) return;

    const batch = this.pending;
    this.pending = new Map();

    for (const [clientId, payload] of batch) {
      this.session.broadcast(
        {
          v: 1,
          id: this.hub.idGen.messageId(),
          type: "presence.updated",
          session: this.session.name,
          from: clientId,
          payload,
        },
      );
    }
  }
}
