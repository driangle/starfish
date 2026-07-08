import type { StarfishFrame, DeliveryOptions } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";

export class Messaging {
  private connection: Connection;
  private session: Session;

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
  }

  send(to: string | string[], payload: any): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("send"),
      type: "client.send",
      session: sessionName,
      to,
      payload,
    };

    this.connection.send(frame);
  }

  broadcast(
    payload: any,
    options?: { includeSelf?: boolean },
  ): void {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("bcast"),
      type: "session.broadcast",
      session: sessionName,
      payload,
    };

    if (options?.includeSelf) {
      frame.options = { delivery: { includeSelf: true } };
    }

    this.connection.send(frame);
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
