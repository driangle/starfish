import type { StarfishFrame, SaveOptions, DataResult } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import {
  MAX_DATA_VALUE_SIZE,
  validatePayloadSize,
} from "./limits.js";

export class Data {
  private connection: Connection;
  private session: Session;

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
  }

  async save(options: SaveOptions): Promise<DataResult> {
    const sessionName = this.requireSession();

    if (options.data !== undefined) {
      const json = JSON.stringify(options.data);
      validatePayloadSize(json, MAX_DATA_VALUE_SIZE, "Data value");
    }

    const payload: any = {
      key: options.key,
      scope: options.scope,
      op: options.op,
    };
    if (options.data !== undefined) payload.data = options.data;
    if (options.expectedVersion !== undefined)
      payload.expectedVersion = options.expectedVersion;

    const frame: StarfishFrame = {
      v: 1,
      id: nextId("dsave"),
      type: "data.save",
      session: sessionName,
      payload,
    };

    const response = await this.connection.sendAndWait(frame);
    return {
      key: response.payload.key,
      scope: response.payload.scope,
      data: response.payload.data,
      version: response.payload.version,
    };
  }

  async get(options: {
    key: string;
    scope: "self" | "session";
  }): Promise<DataResult> {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("dget"),
      type: "data.get",
      session: sessionName,
      payload: { key: options.key, scope: options.scope },
    };

    const response = await this.connection.sendAndWait(frame);
    return {
      key: response.payload.key,
      scope: response.payload.scope,
      data: response.payload.data,
      version: response.payload.version,
    };
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new Error("Not in a session. Call join() first.");
    }
    return session;
  }
}
