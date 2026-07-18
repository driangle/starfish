import WebSocket from "ws";
import type { StarfishFrame } from "./types.js";
import { SERVER_URL, DEFAULT_TIMEOUT, uniqueId } from "./setup.js";
import { helloFrame, joinFrame } from "./frames.js";

interface Waiter {
  predicate: (f: StarfishFrame) => boolean;
  resolve: (f: StarfishFrame) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class StarfishTestClient {
  private ws: WebSocket;
  private inbox: StarfishFrame[] = [];
  private waiters: Waiter[] = [];
  private closed = false;

  public clientId?: string;
  public resumeToken?: string;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.on("message", (data: WebSocket.Data) => {
      const frame: StarfishFrame = JSON.parse(data.toString());
      this.dispatch(frame);
    });
    this.ws.on("close", () => {
      this.closed = true;
    });
  }

  private dispatch(frame: StarfishFrame): void {
    for (let i = 0; i < this.waiters.length; i++) {
      if (this.waiters[i].predicate(frame)) {
        const waiter = this.waiters.splice(i, 1)[0];
        clearTimeout(waiter.timer);
        waiter.resolve(frame);
        return;
      }
    }
    this.inbox.push(frame);
  }

  static async connect(url?: string): Promise<StarfishTestClient> {
    const ws = new WebSocket(url ?? SERVER_URL);
    return new Promise((resolve, reject) => {
      ws.on("open", () => resolve(new StarfishTestClient(ws)));
      ws.on("error", reject);
    });
  }

  async send(frame: StarfishFrame): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(frame), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async sendRaw(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(data, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  waitFor(
    predicate: (f: StarfishFrame) => boolean,
    timeout = DEFAULT_TIMEOUT,
  ): Promise<StarfishFrame> {
    // Check inbox first
    for (let i = 0; i < this.inbox.length; i++) {
      if (predicate(this.inbox[i])) {
        return Promise.resolve(this.inbox.splice(i, 1)[0]);
      }
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx !== -1) this.waiters.splice(idx, 1);
        reject(new Error(`Timed out waiting for message (${timeout}ms)`));
      }, timeout);

      this.waiters.push({ predicate, resolve, reject, timer });
    });
  }

  waitForType(type: string, timeout?: number): Promise<StarfishFrame> {
    return this.waitFor((f) => `${f.header.resource}.${f.header.method}` === type, timeout);
  }

  waitForReply(messageId: string, timeout?: number): Promise<StarfishFrame> {
    return this.waitFor((f) => f.header.replyTo === messageId, timeout);
  }

  waitForError(timeout?: number): Promise<StarfishFrame> {
    return this.waitFor((f) => (f.payload as any)?.status === "error", timeout);
  }

  async hello(opts?: {
    name?: string;
    role?: string;
    resumeToken?: string;
  }): Promise<StarfishFrame> {
    const frame = helloFrame(opts);
    await this.send(frame);
    const welcome = await this.waitForReply(frame.header.id);
    if (welcome.header.resource === "client" && welcome.header.method === "welcome") {
      this.clientId = (welcome.payload as any).clientId;
      this.resumeToken = (welcome.payload as any).resumeToken;
    }
    return welcome;
  }

  async join(
    session: string,
    opts?: { create?: boolean; name?: string; role?: string },
  ): Promise<StarfishFrame> {
    const frame = joinFrame(session, { create: opts?.create ?? true, ...opts });
    await this.send(frame);
    return this.waitForReply(frame.header.id);
  }

  async drain(timeout = 200): Promise<StarfishFrame[]> {
    const frames: StarfishFrame[] = [...this.inbox];
    this.inbox = [];

    // Collect any more that arrive within the timeout
    try {
      while (true) {
        const f = await this.waitFor(() => true, timeout);
        frames.push(f);
      }
    } catch {
      // Timeout is expected — we've drained everything
    }

    return frames;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    // Clean up all pending waiters
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error("Client closed"));
    }
    this.waiters = [];

    return new Promise((resolve) => {
      this.ws.on("close", () => resolve());
      this.ws.close();
    });
  }
}
