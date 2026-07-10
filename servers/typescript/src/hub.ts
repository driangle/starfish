import http from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { StarfishConfig } from "./config.js";
import { IDGenerator } from "./id.js";
import { Handler } from "./handler.js";
import { Client } from "./client.js";

export class Hub {
  readonly config: StarfishConfig;
  readonly idGen: IDGenerator;
  readonly handler: Handler;

  private clients = new Map<string, Client>();
  private wss: WebSocketServer;
  private server: http.Server;

  constructor(config: StarfishConfig) {
    this.config = config;
    this.idGen = new IDGenerator();
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

  shutdown(): Promise<void> {
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
