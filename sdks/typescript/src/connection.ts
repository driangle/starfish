import {
  StarfishError,
  type StarfishFrame,
  type StarfishClientOptions,
  type WebSocketLike,
  type ConnectionState,
} from "./types.js";
import { nextId } from "./id.js";
import { Observable, EventStream } from "./emitter.js";
import { PendingRequests } from "./pending.js";
import { validateSerializable } from "./validate.js";
import { computeReconnectDelay } from "./reconnect.js";

const DEFAULT_REQUEST_TIMEOUT = 10_000;

export class Connection {
  private options: StarfishClientOptions;
  private ws: WebSocketLike | null = null;
  private pending = new PendingRequests();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
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
    const promise = this.pending.add(frame.header.id, timeout);
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
    const welcome = await this.sendAndWait({
      header: {
        v: 1,
        id: nextId("hello"),
        resource: "client",
        method: "hello",
        kind: "request",
        ts: Date.now(),
      },
      payload: this.buildHelloPayload(),
    });

    this.clientId = welcome.payload!.clientId as string;
    this.resumeToken = welcome.payload!.resumeToken as string;
    this.heartbeatInterval =
      (welcome.payload!.heartbeatInterval as number) ?? this.heartbeatInterval;
    this.serverTime = (welcome.payload!.serverTime as number) ?? null;
    this.reconnectAttempt = 0;
    this.state$.set("connected");
    return welcome;
  }

  private buildHelloPayload(): any {
    const capabilities = { rtc: !!this.options.rtc };
    if (this.resumeToken) return { versions: [1], resumeToken: this.resumeToken, capabilities };
    return {
      versions: [1],
      client: {
        name: this.options.client?.name ?? "starfish-client",
        role: this.options.client?.role ?? "default",
        meta: this.options.client?.meta ?? {},
      },
      capabilities,
      auth: this.options.auth ?? { type: "none" },
    };
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
    const delay = computeReconnectDelay(this.reconnectAttempt, this.options.reconnect);
    if (delay === null) {
      this.state$.set("disconnected");
      return;
    }

    this.state$.set("reconnecting");
    this.reconnectAttempt++;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, delay);
  }

  private cancelReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}
