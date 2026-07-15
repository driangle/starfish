import {
  StarfishError,
  type StarfishFrame,
  type StarfishClientOptions,
  type JoinOptions,
  type SaveOptions,
  type DataResult,
  type EventFilter,
  type ClientInfo,
  type ConnectionState,
  type FrameOptions,
  type RTCPeerInfo,
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
import { RTC } from "./rtc.js";
import { Pool } from "./pool.js";
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
  private _rtc: RTC | null;
  private _pool: Pool;

  readonly clock: Clock;

  constructor(options: StarfishClientOptions) {
    this.connection = new Connection(options);
    this.heartbeat = new Heartbeat(this.connection);
    this.clock = new Clock(this.connection);
    this._events = new Events();
    this._session = new Session(this.connection);
    this._rtc = options.rtc ? new RTC(this.connection, this._session, options.rtc) : null;
    this._topics = new Topics(this.connection, this._session, this._rtc);
    this._messaging = new Messaging(this.connection, this._session, this._rtc);
    this._presence = new Presence(this.connection, this._session);
    this._data = new Data(this.connection, this._session);
    this._pool = new Pool(this.connection, this._session);

    this.connection.frames$.subscribe((frame) => {
      if (frame.type.startsWith("rtc.") && this._rtc) {
        this._rtc.handleFrame(frame);
      } else {
        this.dispatchFrame(frame);
      }
    });

    this._rtc?.frames$.subscribe((frame) => this.dispatchFrame(frame));

    this.connection.state$.subscribe((state) => {
      state === "connected" ? this.heartbeat.start() : this.heartbeat.stop();
    });
  }

  private dispatchFrame(frame: StarfishFrame): void {
    this._events.dispatch(frame);
    this._session.handleFrame(frame);
    this._topics.handleFrame(frame);
    this._messaging.handleFrame(frame);
    this._presence.handleFrame(frame);
    this._data.handleFrame(frame);
    this._pool.handleFrame(frame);
  }

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
    this._pool.clear();
    this._rtc?.closeAll();
    await this.connection.disconnect();
  }

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
    this._pool.clear();
    this._rtc?.closeAll();
    return this._session.leave();
  }

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

  send(to: string | string[], payload: any, options?: FrameOptions): void {
    this._messaging.send(to, payload, options);
  }

  get messages$(): EventStream<StarfishFrame> {
    return this._messaging.messages$;
  }

  messagesFrom$(peerId: string): EventStream<StarfishFrame> {
    return this._messaging.messagesFrom$(peerId);
  }

  broadcast(payload: any, options?: FrameOptions): void {
    this._messaging.broadcast(payload, options);
  }

  get presence(): Presence {
    return this._presence;
  }
  get pool(): Pool {
    return this._pool;
  }
  get presence$(): Observable<Map<string, any>> {
    return this._presence.presence$;
  }
  async save(options: SaveOptions): Promise<DataResult> {
    return this._data.save(options);
  }
  async get(options: { key: string; scope: "self" | "session" }): Promise<DataResult> {
    return this._data.get(options);
  }
  get changed$(): EventStream<DataResult> {
    return this._data.changed$;
  }
  key$(key: string): EventStream<DataResult> {
    return this._data.key$(key);
  }

  private get rtc(): RTC {
    if (!this._rtc) {
      throw new StarfishError(
        "RTC_NOT_ENABLED",
        "RTC is not enabled. Provide rtc options in StarfishClientOptions.",
      );
    }
    return this._rtc;
  }

  get rtcPeers$(): Observable<RTCPeerInfo[]> | null {
    return this._rtc?.rtcPeers$ ?? null;
  }
  async connectRTC(peerId: string, channels?: string[]): Promise<void> {
    return this.rtc.connect(peerId, channels);
  }
  disconnectRTC(peerId: string): void {
    this.rtc.disconnect(peerId);
  }
  events$(filter?: EventFilter): EventStream<StarfishFrame> {
    return this._events.events$(filter);
  }
  on(callback: (frame: StarfishFrame) => void): Unsubscribe {
    return this._events.subscribe(callback);
  }
}
