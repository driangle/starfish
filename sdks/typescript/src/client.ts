import type {
  StarfishFrame,
  StarfishClientOptions,
  JoinOptions,
  SaveOptions,
  DataResult,
  EventFilter,
  ClientInfo,
  ConnectionState,
  FrameOptions,
} from "./types.js";
import { Connection } from "./connection.js";
import { Heartbeat } from "./heartbeat.js";
import { Clock } from "./clock.js";
import { Events } from "./events.js";
import { Session } from "./session.js";
import { Topics } from "./topics.js";
import { Messaging } from "./messaging.js";
import { Presence } from "./presence.js";
import { Data } from "./data.js";
import { Observable, EventStream, type Unsubscribe } from "./emitter.js";

export class StarfishClient {
  private connection: Connection;
  private heartbeat: Heartbeat;
  private _events: Events;
  private _session: Session;
  private _topics: Topics;
  private _messaging: Messaging;
  private _presence: Presence;
  private _data: Data;

  readonly clock: Clock;

  constructor(options: StarfishClientOptions) {
    this.connection = new Connection(options);
    this.heartbeat = new Heartbeat(this.connection);
    this.clock = new Clock(this.connection);
    this._events = new Events();
    this._session = new Session(this.connection);
    this._topics = new Topics(this.connection, this._session);
    this._messaging = new Messaging(this.connection, this._session);
    this._presence = new Presence(this.connection, this._session);
    this._data = new Data(this.connection, this._session);

    // Route incoming frames to managers
    this.connection.frames$.subscribe((frame) => {
      this._events.dispatch(frame);
      this._session.handleFrame(frame);
      this._topics.handleFrame(frame);
      this._presence.handleFrame(frame);
    });

    // Manage heartbeat lifecycle
    this.connection.state$.subscribe((state) => {
      if (state === "connected") {
        this.heartbeat.start();
      } else {
        this.heartbeat.stop();
      }
    });
  }

  // --- Connection ---

  get connection$(): Observable<ConnectionState> {
    return this.connection.state$;
  }

  get clientId(): string | null {
    return this.connection.clientId;
  }

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  async disconnect(): Promise<void> {
    this.heartbeat.stop();
    this._presence.clear();
    await this.connection.disconnect();
  }

  // --- Session ---

  get clients$(): Observable<ClientInfo[]> {
    return this._session.clients$;
  }

  get peers$(): Observable<ClientInfo[]> {
    return this._session.peers$;
  }

  async join(session: string, options?: JoinOptions): Promise<StarfishFrame> {
    return this._session.join(session, options);
  }

  async leave(): Promise<void> {
    this._presence.clear();
    return this._session.leave();
  }

  // --- Topics ---

  async subscribe(
    topic: string,
    callback?: (frame: StarfishFrame) => void,
  ): Promise<StarfishFrame> {
    return this._topics.subscribe(topic, callback);
  }

  async unsubscribe(topic: string): Promise<void> {
    return this._topics.unsubscribe(topic);
  }

  publish(topic: string, payload: any, options?: FrameOptions): void {
    this._topics.publish(topic, payload, options);
  }

  topic$(topic: string): EventStream<StarfishFrame> {
    return this._topics.topic$(topic);
  }

  // --- Messaging ---

  send(to: string | string[], payload: any): void {
    this._messaging.send(to, payload);
  }

  broadcast(payload: any, options?: { includeSelf?: boolean }): void {
    this._messaging.broadcast(payload, options);
  }

  // --- Presence ---

  get presence(): Presence {
    return this._presence;
  }

  get presence$(): Observable<Map<string, any>> {
    return this._presence.presence$;
  }

  // --- Data ---

  async save(options: SaveOptions): Promise<DataResult> {
    return this._data.save(options);
  }

  async get(options: { key: string; scope: "self" | "session" }): Promise<DataResult> {
    return this._data.get(options);
  }

  // --- Events ---

  events$(filter?: EventFilter): EventStream<StarfishFrame> {
    return this._events.events$(filter);
  }

  on(callback: (frame: StarfishFrame) => void): Unsubscribe {
    return this._events.subscribe(callback);
  }

  // --- Clock ---

  at(
    serverTime: number,
    callback: () => void,
  ): ReturnType<typeof setTimeout> {
    return this.clock.at(serverTime, callback);
  }
}
