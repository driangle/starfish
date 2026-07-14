import {
  StarfishError,
  type StarfishFrame,
  type StarfishClientOptions,
  type WebSocketLike,
  type ConnectionState,
} from "./types.js";
import { nextId, resetIdCounter } from "./id.js";
import { Observable, EventStream } from "./emitter.js";
import { PendingRequests } from "./pending.js";
import { validateSerializable } from "./validate.js";

const DEFAULT_REQUEST_TIMEOUT = 10_000;

const RECONNECT_DEFAULTS = {
  enabled: true,
  maxRetries: Infinity,
  baseDelay: 1000,
  maxDelay: 30_000,
};

export class Connection {
  private options: StarfishClientOptions;
  private ws: WebSocketLike | null = null;
  private pending = new PendingRequests();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;

  // State from server.welcome
  clientId: string | null = null;
  resumeToken: string | null = null;
  heartbeatInterval = 15_000;
  serverTime: number | null = null;

  readonly state$ = new Observable<ConnectionState>("disconnected");
  readonly frames$ = new EventStream<StarfishFrame>();

  constructor(options: StarfishClientOptions) {
    this.options = options;
  }

  async connect(): Promise<StarfishFrame> {
    this.intentionalClose = false;
    this.state$.set("connecting");

    return new Promise<StarfishFrame>((resolve, reject) => {
      try {
        this.ws = this.createWebSocket();
      } catch (err) {
        this.state$.set("disconnected");
        reject(err);
        return;
      }

      this.ws.onopen = () => {
        this.doHandshake().then(resolve).catch(reject);
      };

      this.ws.onerror = (ev: any) => {
        if (this.state$.value === "connecting") {
          this.state$.set("disconnected");
          reject(new StarfishError("CONNECTION_FAILED", "WebSocket connection failed"));
        }
      };

      this.ws.onclose = () => {
        this.handleClose();
      };

      this.ws.onmessage = (ev: any) => {
        const data = typeof ev.data === "string" ? ev.data : String(ev.data);
        const frame: StarfishFrame = JSON.parse(data);
        if (!this.pending.resolve(frame)) {
          this.frames$.emit(frame);
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    this.intentionalClose = true;
    this.cancelReconnect();
    this.pending.rejectAll(new StarfishError("DISCONNECTED", "Client disconnected"));

    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.close(1000, "client disconnect");
      this.ws = null;
    }

    this.state$.set("disconnected");
  }

  send(frame: StarfishFrame): void {
    if (!this.ws || this.ws.readyState !== 1) {
      throw new StarfishError("NOT_CONNECTED", "Not connected");
    }
    validateSerializable(frame, "Frame");
    this.ws.send(JSON.stringify(frame));
  }

  sendAndWait(frame: StarfishFrame, timeout = DEFAULT_REQUEST_TIMEOUT): Promise<StarfishFrame> {
    const promise = this.pending.add(frame.id, timeout);
    this.send(frame);
    return promise;
  }

  private createWebSocket(): WebSocketLike {
    if (this.options.ws) {
      return this.options.ws(this.options.server);
    }

    const WS = typeof globalThis !== "undefined" ? (globalThis as any).WebSocket : undefined;
    if (!WS) {
      throw new StarfishError(
        "NO_WEBSOCKET",
        "No WebSocket implementation available. Provide one via options.ws.",
      );
    }
    return new WS(this.options.server) as WebSocketLike;
  }

  private async doHandshake(): Promise<StarfishFrame> {
    const capabilities = { rtc: !!this.options.rtc };
    const payload: any = this.resumeToken
      ? { resumeToken: this.resumeToken, capabilities }
      : {
          client: {
            name: this.options.client?.name ?? "starfish-client",
            role: this.options.client?.role ?? "default",
            meta: this.options.client?.meta ?? {},
          },
          capabilities,
          auth: this.options.auth ?? { type: "none" },
        };

    const welcome = await this.sendAndWait({
      v: 1,
      id: nextId("hello"),
      type: "client.hello",
      ts: Date.now(),
      payload,
    });

    this.clientId = welcome.payload.clientId;
    this.resumeToken = welcome.payload.resumeToken;
    this.heartbeatInterval = welcome.payload.heartbeatInterval ?? this.heartbeatInterval;
    this.serverTime = welcome.payload.serverTime ?? null;
    this.reconnectAttempt = 0;
    this.state$.set("connected");

    return welcome;
  }

  private handleClose(): void {
    this.ws = null;

    if (this.intentionalClose) {
      this.state$.set("disconnected");
      return;
    }

    this.pending.rejectAll(new StarfishError("CONNECTION_LOST", "Connection lost"));
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    const opts = { ...RECONNECT_DEFAULTS, ...this.options.reconnect };

    if (!opts.enabled || this.reconnectAttempt >= opts.maxRetries) {
      this.state$.set("disconnected");
      return;
    }

    this.state$.set("reconnecting");

    const delay = Math.min(
      opts.baseDelay * Math.pow(2, this.reconnectAttempt) + Math.random() * opts.baseDelay,
      opts.maxDelay,
    );
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {
        // reconnect failed — handleClose will schedule the next attempt
      });
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
