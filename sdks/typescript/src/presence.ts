import { StarfishError, type StarfishFrame } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { Observable } from "./emitter.js";
import { MAX_PRESENCE_SIZE, validatePayloadSize } from "./limits.js";
import { validateSerializable } from "./validate.js";

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
    validateSerializable(payload, "Presence payload");
    const json = JSON.stringify(payload);
    validatePayloadSize(json, MAX_PRESENCE_SIZE, "Presence payload");

    const frame: StarfishFrame = {
      header: {
        id: nextId("pres"),
        resource: "presence",
        method: "set",
        kind: "request",
        session: sessionName,
      },
      payload,
    };

    this.connection.send(frame);
  }

  handleFrame(frame: StarfishFrame): void {
    if (
      frame.header.resource === "presence" &&
      frame.header.method === "updated" &&
      frame.header.from
    ) {
      this.presenceMap.set(frame.header.from, frame.payload);
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
      throw new StarfishError("NO_SESSION", "Not in a session. Call join() first.");
    }
    return session;
  }
}
