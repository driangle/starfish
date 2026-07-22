// Pool Matchmaking Example
// ------------------------
// Demonstrates: pool enter, auto-matching, and joining matched sessions
//
// Run: npm run pool-matchmaking
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This example creates two clients that enter the same pool in auto mode.
// The server pairs them, and they join the matched session and exchange
// a message over pub/sub.

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const clientA = createClient("clientA");
  const clientB = createClient("clientB");

  // Connect both clients and join a staging session (required before entering a pool)
  await clientA.connect();
  await clientB.connect();
  await clientA.join("pool-matchmaking-staging");
  await clientB.join("pool-matchmaking-staging");
  console.log("Both clients connected and joined staging session.");

  // Track when each client is matched
  const matchedA = new Promise<string>((resolve) => {
    clientA.pool.matched$.subscribe((event) => {
      console.log(
        `clientA matched! Session: ${event.session}, peers: ${event.peers.map((p) => p.id).join(", ")}`,
      );
      resolve(event.session);
    });
  });

  const matchedB = new Promise<string>((resolve) => {
    clientB.pool.matched$.subscribe((event) => {
      console.log(
        `clientB matched! Session: ${event.session}, peers: ${event.peers.map((p) => p.id).join(", ")}`,
      );
      resolve(event.session);
    });
  });

  // Enter the pool — auto mode pairs clients automatically.
  // create: true lets whichever client arrives first open the pool.
  console.log("Both clients entering pool 'distant-touch'...");
  await clientA.pool.enter("distant-touch", { groupSize: 2, create: true });
  console.log("clientA entered the pool.");
  await clientB.pool.enter("distant-touch", { groupSize: 2, create: true });
  console.log("clientB entered the pool.");

  // Wait for both clients to be matched
  const [sessionA, sessionB] = await Promise.all([matchedA, matchedB]);
  console.log(`Both clients matched into session: ${sessionA}`);

  // Join the matched session
  await clientA.join(sessionA);
  await clientB.join(sessionB);
  console.log("Both clients joined the matched session.");

  // Set up clientB to receive a message
  await clientB.subscribe("greetings");
  const received = new Promise<void>((resolve) => {
    clientB.topic$("greetings").subscribe((frame) => {
      console.log(`clientB received: ${JSON.stringify(frame.payload)}`);
      resolve();
    });
  });

  await sleep(200);

  // clientA sends a ping
  console.log('clientA publishing ping on "greetings" topic...');
  clientA.publish("greetings", { message: "ping" });

  await received;

  // Clean up
  await clientA.disconnect();
  await clientB.disconnect();
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
