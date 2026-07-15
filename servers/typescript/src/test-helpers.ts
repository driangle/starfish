import { Handler } from "./handler.js";
import { IDGenerator } from "./id.js";
import { defaultConfig } from "./config.js";
import { Session } from "./session.js";
import { Pool, type PoolMode } from "./pool.js";
import { ResumeRegistry } from "./resume.js";
import type { StarfishFrame } from "./types.js";
import type { Client, ClientInfo } from "./client.js";
import type { StarfishServer } from "./starfish_server.js";

export function createTestHub(): StarfishServer {
  const config = defaultConfig();
  const idGen = new IDGenerator();
  const clients = new Map<string, Client>();
  const sessions = new Map<string, Session>();
  const pools = new Map<string, Pool>();

  const hub: Record<string, unknown> = {
    config,
    idGen,
    handler: null,
    resumes: null,
    registerClient(c: Client) {
      clients.set(c.id, c);
    },
    removeClient(c: Client) {
      clients.delete(c.id);
    },
    getClient(id: string) {
      return clients.get(id);
    },
    getClients() {
      return clients.values();
    },
    getSession(name: string) {
      return sessions.get(name);
    },
    getOrCreateSession(name: string) {
      let s = sessions.get(name);
      if (s) return s;
      s = new Session(name, hub as unknown as StarfishServer);
      sessions.set(name, s);
      return s;
    },
    removeSession(name: string) {
      const s = sessions.get(name);
      if (s) {
        s.destroy();
        sessions.delete(name);
      }
    },
    getPool(name: string) {
      return pools.get(name);
    },
    getOrCreatePool(name: string, mode: PoolMode, groupSize: number) {
      let p = pools.get(name);
      if (p) return p;
      p = new Pool(name, mode, groupSize);
      pools.set(name, p);
      return p;
    },
    removePool(name: string) {
      pools.delete(name);
    },
    handleClientDisconnect(client: Client) {
      (hub.resumes as ResumeRegistry).store(client);
    },
  };

  hub.resumes = new ResumeRegistry(hub as unknown as StarfishServer);
  hub.handler = new Handler(hub as unknown as StarfishServer);
  return hub as unknown as StarfishServer;
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
  pools: Set<string>;
  topics: Map<string, Set<string>>;
  sent: StarfishFrame[];
  sendFrame(frame: StarfishFrame): void;
  info(): ClientInfo;
  close(): void;
};

export function createTestClient(
  _hub: StarfishServer,
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
    pools: new Set<string>(),
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
  hub: StarfishServer,
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
