import { StarfishClient, type StarfishFrame, type Unsubscribe, type DataResult } from "@starfish/client";
import type { StarfishP5Options, PeerPresence } from "./types.js";
import { PresenceTracker } from "./presence-tracker.js";
import { hookRemove } from "./p5-lifecycle.js";

export class StarfishP5 {
  readonly client: StarfishClient;
  private readonly options: StarfishP5Options;
  private tracker: PresenceTracker | null = null;
  private _peers: PeerPresence[] = [];
  private _connected = false;
  private subscriptions: Unsubscribe[] = [];
  private pendingSubscriptions: Array<{ topic: string; cb: (payload: any, from: string) => void }> = [];
  private sharedCache = new Map<string, unknown>();

  constructor(options: StarfishP5Options) {
    this.options = options;
    this.client = new StarfishClient({
      server: options.url,
      client: {
        name: options.name,
        meta: options.meta,
      },
      auth: options.auth,
      reconnect: options.reconnect,
    });

    this.subscriptions.push(
      this.client.connection$.subscribe((state) => {
        this._connected = state === "connected";
      }),
    );

    this.subscriptions.push(
      this.client.presence$.subscribe((presenceMap) => {
        this._peers = PresenceTracker.toPeers(presenceMap, this.client.clientId);
      }),
    );

    this.subscriptions.push(
      this.client.changed$.subscribe((result: DataResult) => {
        if (result.scope === "session") {
          this.sharedCache.set(result.key, result.data);
        }
      }),
    );

    hookRemove(options.p5, () => this.stop());
  }

  async start(): Promise<void> {
    await this.client.connect();
    await this.client.join(this.options.session);

    this.tracker = new PresenceTracker(
      this.client.presence,
      this.options.p5,
      this.options.presence,
    );

    for (const { topic, cb } of this.pendingSubscriptions) {
      await this.subscribeInternal(topic, cb);
    }
    this.pendingSubscriptions = [];
  }

  update(): void {
    this.tracker?.update();
  }

  async stop(): Promise<void> {
    for (const unsub of this.subscriptions) {
      unsub();
    }
    this.subscriptions = [];
    this.tracker = null;
    await this.client.disconnect();
  }

  get connected(): boolean {
    return this._connected;
  }

  get clientId(): string | null {
    return this.client.clientId;
  }

  get peers(): PeerPresence[] {
    return this._peers;
  }

  eachPeer(fn: (peer: PeerPresence) => void): void {
    for (const peer of this._peers) {
      fn(peer);
    }
  }

  setPresence(data: Record<string, unknown>): void {
    this.tracker?.setData(data);
  }

  on(topic: string, cb: (payload: any, from: string) => void): void {
    if (!this._connected) {
      this.pendingSubscriptions.push({ topic, cb });
      return;
    }
    this.subscribeInternal(topic, cb);
  }

  private async subscribeInternal(topic: string, cb: (payload: any, from: string) => void): Promise<void> {
    await this.client.subscribe(topic);
    const unsub = this.client.topic$(topic).subscribe((frame: StarfishFrame) => {
      cb(frame.payload, frame.from ?? "");
    });
    this.subscriptions.push(unsub);
  }

  emit(topic: string, payload: any): void {
    this.client.publish(topic, payload);
  }

  async setShared(key: string, data: unknown): Promise<void> {
    await this.client.save({ key, scope: "session", op: "replace", data });
  }

  getShared(key: string): unknown {
    return this.sharedCache.get(key);
  }

  onShared(key: string, cb: (data: unknown) => void): void {
    const unsub = this.client.key$(key).subscribe((result: DataResult) => {
      if (result.scope === "session") {
        cb(result.data);
      }
    });
    this.subscriptions.push(unsub);
  }

  sendTo(peerId: string, payload: any): void {
    this.client.send(peerId, payload);
  }

  broadcast(payload: any): void {
    this.client.broadcast(payload);
  }
}
