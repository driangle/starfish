import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { StarfishConfig } from "./config.js";
import { IDGenerator } from "./id.js";
import { Handler } from "./handler.js";
import { Client } from "./client.js";
import { Session } from "./session.js";
import { Pool, type PoolMode } from "./pool.js";
import { ResumeRegistry } from "./resume.js";
import { HeartbeatChecker } from "./heartbeat.js";

export class StarfishServer {
  readonly config: StarfishConfig;
  readonly idGen: IDGenerator;
  readonly handler: Handler;
  readonly resumes: ResumeRegistry;

  private clients = new Map<string, Client>();
  private sessions = new Map<string, Session>();
  private pools = new Map<string, Pool>();
  private wss: WebSocketServer;
  private server: http.Server;
  private heartbeat: HeartbeatChecker;

  constructor(config: StarfishConfig) {
    this.config = config;
    this.idGen = new IDGenerator();
    this.resumes = new ResumeRegistry(this);
    this.heartbeat = new HeartbeatChecker(this);
    this.handler = new Handler(this);

    this.server = http.createServer((_req, res) => {
      res.writeHead(404);
      res.end();
    });

    this.wss = new WebSocketServer({
      noServer: true,
      maxPayload: config.maxWsMessageSize,
    });

    this.server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (url.pathname !== "/starfish") {
        socket.destroy();
        return;
      }
      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.handleConnection(ws);
      });
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.config.port, () => {
        console.log(`Starfish server listening on :${this.config.port}`);
        this.heartbeat.start();
        resolve();
      });
    });
  }

  registerClient(client: Client): void {
    this.clients.set(client.id, client);
  }

  removeClient(client: Client): void {
    if (client.id && this.clients.has(client.id)) {
      this.clients.delete(client.id);
    }
  }

  getClient(clientId: string): Client | undefined {
    return this.clients.get(clientId);
  }

  getClients(): Iterable<Client> {
    return this.clients.values();
  }

  getSession(name: string): Session | undefined {
    return this.sessions.get(name);
  }

  getOrCreateSession(name: string): Session {
    let session = this.sessions.get(name);
    if (session) return session;

    session = new Session(name, this);
    this.sessions.set(name, session);
    return session;
  }

  removeSession(name: string): void {
    const session = this.sessions.get(name);
    if (session) {
      session.destroy();
      this.sessions.delete(name);
    }
  }

  getPool(name: string): Pool | undefined {
    return this.pools.get(name);
  }

  getOrCreatePool(name: string, mode: PoolMode, groupSize: number): Pool {
    let pool = this.pools.get(name);
    if (pool) return pool;

    pool = new Pool(name, mode, groupSize);
    this.pools.set(name, pool);
    return pool;
  }

  removePool(name: string): void {
    this.pools.delete(name);
  }

  handleClientDisconnect(client: Client): void {
    this.resumes.store(client);
  }

  shutdown(): Promise<void> {
    this.heartbeat.stop();
    return new Promise((resolve) => {
      for (const client of this.clients.values()) {
        client.close();
      }
      this.clients.clear();
      this.wss.close(() => {
        this.server.close(() => resolve());
      });
    });
  }

  private handleConnection(ws: WebSocket): void {
    const client = new Client(this, ws);
    client.start();
  }
}
