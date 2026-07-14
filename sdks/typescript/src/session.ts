import { StarfishError, type StarfishFrame, type JoinOptions, type ClientInfo } from "./types.js";
import type { Connection } from "./connection.js";
import { nextId } from "./id.js";
import { Observable } from "./emitter.js";

export class Session {
  private connection: Connection;
  private _session: string | null = null;
  private _clients = new Map<string, ClientInfo>();

  readonly clients$ = new Observable<ClientInfo[]>([]);
  readonly peers$ = new Observable<ClientInfo[]>([]);

  constructor(connection: Connection) {
    this.connection = connection;
  }

  get current(): string | null {
    return this._session;
  }

  get clientId(): string | null {
    return this.connection.clientId;
  }

  require(): string {
    if (!this._session) {
      throw new StarfishError("NO_SESSION", "Not in a session. Call join() first.");
    }
    return this._session;
  }

  async join(session: string, options?: JoinOptions): Promise<StarfishFrame> {
    const frame: StarfishFrame = {
      v: 1,
      id: nextId("join"),
      type: "session.join",
      session,
      payload: {
        create: options?.create ?? true,
        name: options?.name ?? this.connection.clientId ?? "client",
        role: options?.role ?? "default",
        meta: options?.meta ?? {},
      },
    };

    const response = await this.connection.sendAndWait(frame);
    this._session = session;

    const clients: ClientInfo[] = response.payload?.clients ?? [];
    this._clients.clear();
    for (const c of clients) {
      this._clients.set(c.id, c);
    }
    this.updateObservables();

    return response;
  }

  async leave(): Promise<void> {
    if (!this._session) return;

    const frame: StarfishFrame = {
      v: 1,
      id: nextId("leave"),
      type: "session.leave",
      session: this._session,
    };

    this.connection.send(frame);
    this._session = null;
    this._clients.clear();
    this.updateObservables();
  }

  handleFrame(frame: StarfishFrame): void {
    if (!this._session || frame.session !== this._session) return;

    switch (frame.type) {
      case "client.connected": {
        const client = frame.payload?.client as ClientInfo | undefined;
        if (client) {
          this._clients.set(client.id, client);
          this.updateObservables();
        }
        break;
      }
      case "client.disconnected": {
        const clientId = frame.payload?.clientId as string | undefined;
        if (clientId) {
          this._clients.delete(clientId);
          this.updateObservables();
        }
        break;
      }
    }
  }

  private updateObservables(): void {
    const all = Array.from(this._clients.values());
    this.clients$.set(all);
    this.peers$.set(all.filter((c) => c.id !== this.clientId));
  }
}
