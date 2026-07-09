// Connection Example
// -------------------
// Demonstrates: client setup, WebSocket factory for Node.js, handshake, session join/leave
//
// Run: npm run connection
// Requires: Starfish server running at ws://localhost:8080/starfish

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";

async function main() {
  // In Node.js, there's no global WebSocket -- pass the `ws` library via the `ws` option.
  const client = new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: {
      name: "connection-example",
      role: "demo",
      meta: { version: 1 },
    },
  });

  // Subscribe to connection state changes
  client.connection$.subscribe((state) => {
    console.log(`Connection state: ${state}`);
  });

  // Connect to the server (performs WebSocket handshake + client.hello/server.welcome)
  console.log("Connecting...");
  await client.connect();
  console.log(`Connected! Client ID: ${client.clientId}`);

  // Join a session -- creates it if it doesn't exist
  console.log("Joining session...");
  const joinResult = await client.join("example-session", {
    name: "connection-example",
    create: true,
  });
  console.log("Joined session:", joinResult.payload);

  // Listen for other clients joining/leaving
  client.clients$.subscribe((clients) => {
    console.log(`Clients in session: ${clients.length}`);
  });

  // Stay connected for a few seconds to demonstrate the heartbeat
  console.log("Listening for 3 seconds...");
  await sleep(3000);

  // Leave the session
  console.log("Leaving session...");
  await client.leave();

  // Disconnect from the server
  console.log("Disconnecting...");
  await client.disconnect();
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
