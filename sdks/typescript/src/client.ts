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
  RTCPeerInfo,
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
import { nextId } from "./id.js";
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

  readonly clock: Clock;

  constructor(options: StarfishClientOptions) {
    this.connection = new Connection(options);
    this.heartbeat = new Heartbeat(this.connection);
    this.clock = new Clock(this.connection);
    this._events = new Events();
    this._session = new Session(this.connection);
    this._rtc = options.rtc
      ? new RTC(this.connection, this._session, options.rtc)
      : null;
    this._topics = new Topics(this.connection, this._session, this._rtc);
    this._messaging = new Messaging(this.connection, this._session, this._rtc);
    this._presence = new Presence(this.connection, this._session);
    this._data = new Data(this.connection, this._session);

    // Route incoming frames to managers
    this.connection.frames$.subscribe((frame) => {
      // Route RTC signaling frames to RTC module
      if (frame.type.startsWith("rtc.") && this._rtc) {
        this._rtc.handleFrame(frame);
        return;
      }

      this._events.dispatch(frame);
      this._session.handleFrame(frame);
      this._topics.handleFrame(frame);
      this._presence.handleFrame(frame);
      this._data.handleFrame(frame);
    });

    // Route frames received over RTC DataChannels to managers
    if (this._rtc) {
      this._rtc.frames$.subscribe((frame) => {
        this._events.dispatch(frame);
        this._session.handleFrame(frame);
        this._topics.handleFrame(frame);
        this._presence.handleFrame(frame);
        this._data.handleFrame(frame);
      });
    }

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
    this._rtc?.closeAll();
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
    this._rtc?.closeAll();
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

  send(to: string | string[], payload: any, options?: FrameOptions): void {
    this._messaging.send(to, payload, options);
  }

  broadcast(payload: any, options?: FrameOptions): void {
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

  get changed$(): EventStream<DataResult> {
    return this._data.changed$;
  }

  key$(key: string): EventStream<DataResult> {
    return this._data.key$(key);
  }

  // --- RTC ---

  get rtcPeers$(): Observable<RTCPeerInfo[]> | null {
    return this._rtc?.rtcPeers$ ?? null;
  }

  async connectRTC(peerId: string, channels?: string[]): Promise<void> {
    if (!this._rtc) {
      throw new Error("RTC is not enabled. Provide rtc options in StarfishClientOptions.");
    }
    return this._rtc.connect(peerId, channels);
  }

  disconnectRTC(peerId: string): void {
    if (!this._rtc) {
      throw new Error("RTC is not enabled. Provide rtc options in StarfishClientOptions.");
    }
    this._rtc.disconnect(peerId);
  }

  sendRTC(peerId: string, channel: string, payload: any): void {
    if (!this._rtc) {
      throw new Error("RTC is not enabled. Provide rtc options in StarfishClientOptions.");
    }
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("rtc"),
      type: "client.send",
      session: this._session.current ?? undefined,
      to: peerId,
      transport: "rtc",
      payload,
    };
    this._rtc.sendToPeer(peerId, channel, frame);
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
