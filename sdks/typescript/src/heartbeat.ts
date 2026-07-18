import type { Connection } from "./connection.js";
import { nextId } from "./id.js";

export class Heartbeat {
  private connection: Connection;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  start(): void {
    this.stop();
    this.timer = setInterval(() => {
      try {
        this.connection.send({
          header: {
            id: nextId("ping"),
            resource: "heartbeat",
            method: "ping",
            kind: "request",
            ts: Date.now(),
          },
        });
      } catch {
        // connection may be closed — heartbeat will be restarted on reconnect
      }
    }, this.connection.heartbeatInterval);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
