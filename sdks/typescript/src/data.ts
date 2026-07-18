import { StarfishError, type StarfishFrame, type SaveOptions, type DataResult } from "./types.js";
import type { Connection } from "./connection.js";
import type { Session } from "./session.js";
import { nextId } from "./id.js";
import { EventStream } from "./emitter.js";
import { MAX_DATA_VALUE_SIZE, validatePayloadSize } from "./limits.js";
import { validateSerializable } from "./validate.js";

export class Data {
  private connection: Connection;
  private session: Session;
  private dataStreams = new Map<string, EventStream<DataResult>>();

  readonly changed$ = new EventStream<DataResult>();

  constructor(connection: Connection, session: Session) {
    this.connection = connection;
    this.session = session;
  }

  handleFrame(frame: StarfishFrame): void {
    if (frame.header.resource === "data" && frame.header.method === "changed" && frame.payload) {
      const result: DataResult = {
        key: frame.payload.key as string,
        scope: frame.payload.scope as "self" | "session",
        data: frame.payload.data,
        version: frame.payload.version as number,
      };
      this.changed$.emit(result);

      const stream = this.dataStreams.get(result.key);
      if (stream) {
        stream.emit(result);
      }
    }
  }

  key$(key: string): EventStream<DataResult> {
    let stream = this.dataStreams.get(key);
    if (!stream) {
      stream = new EventStream<DataResult>();
      this.dataStreams.set(key, stream);
    }
    return stream;
  }

  async save(options: SaveOptions): Promise<DataResult> {
    const sessionName = this.requireSession();

    if (options.data !== undefined) {
      validateSerializable(options.data, "Data value");
      const json = JSON.stringify(options.data);
      validatePayloadSize(json, MAX_DATA_VALUE_SIZE, "Data value");
    }

    const payload: any = {
      key: options.key,
      scope: options.scope,
      op: options.op,
    };
    if (options.data !== undefined) payload.data = options.data;
    if (options.expectedVersion !== undefined) payload.expectedVersion = options.expectedVersion;

    const frame: StarfishFrame = {
      header: {
        id: nextId("dsave"),
        resource: "data",
        method: "save",
        kind: "request",
        session: sessionName,
      },
      payload,
    };

    const response = await this.connection.sendAndWait(frame);
    return {
      key: response.payload!.key as string,
      scope: response.payload!.scope as "self" | "session",
      data: response.payload!.data,
      version: response.payload!.version as number,
    };
  }

  async get(options: { key: string; scope: "self" | "session" }): Promise<DataResult> {
    const sessionName = this.requireSession();
    const frame: StarfishFrame = {
      header: {
        id: nextId("dget"),
        resource: "data",
        method: "get",
        kind: "request",
        session: sessionName,
      },
      payload: { key: options.key, scope: options.scope },
    };

    const response = await this.connection.sendAndWait(frame);
    return {
      key: response.payload!.key as string,
      scope: response.payload!.scope as "self" | "session",
      data: response.payload!.data,
      version: response.payload!.version as number,
    };
  }

  private requireSession(): string {
    const session = this.session.current;
    if (!session) {
      throw new StarfishError("NO_SESSION", "Not in a session. Call join() first.");
    }
    return session;
  }
}
