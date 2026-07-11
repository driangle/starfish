import type { StarfishFrame } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { Observable } from "./emitter.js";
import { MAX_PRESENCE_SIZE, validatePayloadSize } from "./limits.js";

export class Presence {
  private connection: Connection;
  private session: Session;
  private presenceMap = new Map<string, any>();

  readonly presence$ = new Observable<Map<string, any>>(new Map());

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
  }

  set(payload: any): void {
    const sessionName = this.requireSession();
    const json = JSON.stringify(payload);
    validatePayloadSize(json, MAX_PRESENCE_SIZE, "Presence payload");

    const frame: StarfishFrame = {
      v: 1,
      id: nextId("pres"),
      type: "presence.set",
      session: sessionName,
      payload,
    };

    this.connection.send(frame);
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.type === "presence.updated" && frame.from) {
      this.presenceMap.set(frame.from, frame.payload);
      this.presence$.set(new Map(this.presenceMap));
    }
  }

  clear(): void {
    this.presenceMap.clear();
    this.presence$.set(new Map());
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
