import { Handler } from "./handler.js";
import { IDGenerator } from "./id.js";
import { defaultConfig } from "./config.js";
import { Session } from "./session.js";
import type { StarfishFrame } from "./types.js";
import type { Client, ClientInfo } from "./client.js";
import type { Hub } from "./hub.js";

export function createTestHub(): Hub {
  const config = defaultConfig();
  const idGen = new IDGenerator();
  const clients = new Map<string, Client>();
  const sessions = new Map<string, Session>();

  const hub: Record<string, unknown> = {
    config,
    idGen,
    handler: null,
    registerClient(c: Client) {
      clients.set(c.id, c);
    },
    removeClient(c: Client) {
      clients.delete(c.id);
    },
    getClient(id: string) {
      return clients.get(id);
    },
    getSession(name: string) {
      return sessions.get(name);
    },
    getOrCreateSession(name: string) {
      let s = sessions.get(name);
      if (s) return s;
      s = new Session(name);
      sessions.set(name, s);
      return s;
    },
    removeSession(name: string) {
      sessions.delete(name);
    },
    handleClientDisconnect(client: Client) {
      for (const sessionName of client.sessions) {
        const session = sessions.get(sessionName);
        if (!session) continue;
        const empty = session.removeClient(client.id);
        session.broadcast({
          v: 1,
          id: idGen.messageId(),
          type: "client.disconnected",
          session: sessionName,
          payload: { clientId: client.id, reason: "disconnect" },
        });
        if (empty) sessions.delete(sessionName);
      }
      client.sessions.clear();
    },
  };

  hub.handler = new Handler(hub as unknown as Hub);
  return hub as unknown as Hub;
}

type TestClient = {
  id: string;
  name: string;
  role: string;
  meta: unknown;
  rtcCapable: boolean;
  authenticated: boolean;
  lastActivity: number;
  sessions: Set<string>;
  topics: Map<string, Set<string>>;
  sent: StarfishFrame[];
  sendFrame(frame: StarfishFrame): void;
  info(): ClientInfo;
  close(): void;
};

export function createTestClient(
  _hub: Hub,
): Client & { sent: StarfishFrame[] } {
  const sent: StarfishFrame[] = [];
  const client: TestClient = {
    id: "",
    name: "",
    role: "",
    meta: undefined,
    rtcCapable: false,
    authenticated: false,
    lastActivity: Date.now(),
    sessions: new Set<string>(),
    topics: new Map<string, Set<string>>(),
    sent,
    sendFrame(frame: StarfishFrame) {
      if (this.id && !frame.from) frame.from = this.id;
      sent.push(structuredClone(frame));
    },
    info(): ClientInfo {
      const ci: ClientInfo = { id: this.id };
      if (this.name) ci.name = this.name;
      if (this.role) ci.role = this.role;
      if (this.meta !== undefined) ci.meta = this.meta;
      return ci;
    },
    close() {},
  };
  return client as unknown as Client & { sent: StarfishFrame[] };
}

export function authenticate(
  hub: Hub,
  client: Client & { sent: StarfishFrame[] },
): void {
  hub.handler.dispatch(client, {
    v: 1,
    id: "hello",
    type: "client.hello",
    payload: {},
  });
  client.sent.length = 0;
}
