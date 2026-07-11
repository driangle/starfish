import WebSocket from "ws";
import { StarfishClient } from "../src/index.js";
import type { WebSocketLike } from "../src/index.js";

export const SERVER_URL = process.env.STARFISH_SERVER_URL ?? "ws://localhost:8080/starfish";

let counter = 0;
const workerId = Math.random().toString(36).slice(2, 8);

export function uniqueSession(): string {
  return `sdk-test-${workerId}-${Date.now()}-${++counter}`;
}

export function createClient(name = "sdk-test"): StarfishClient {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as unknown as WebSocketLike,
    client: { name, role: "test" },
    auth: { type: "none" },
    reconnect: { enabled: false },
  });
}
