import type { Hub } from "./hub.js";

export class HeartbeatChecker {
  private hub: Hub;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(hub: Hub) {
    this.hub = hub;
  }

  start(): void {
    this.timer = setInterval(
      () => this.check(),
      this.hub.config.heartbeatIntervalMs,
    );
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private check(): void {
    const now = Date.now();
    const timeout = this.hub.config.heartbeatTimeoutMs;

    for (const client of this.hub.getClients()) {
      if (!client.authenticated) continue;
      if (now - client.lastActivity > timeout) {
        client.close();
      }
    }
  }
}
