// Presence Example
// -----------------
// Demonstrates: setting presence, tracking peers, and reacting to presence changes
//
// Run: npm run presence
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This example creates two clients. Each sets presence data, and both
// observe each other's presence updates.

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
  const alice = createClient("Alice");
  const bob = createClient("Bob");

  await alice.connect();
  await bob.connect();
  await alice.join("presence-demo");
  await bob.join("presence-demo");
  console.log("Alice and Bob joined the session.");

  // Watch presence changes from Alice's perspective
  alice.presence$.subscribe((presenceMap) => {
    if (presenceMap.size === 0) return;
    console.log("\nAlice sees presence:");
    for (const [peerId, data] of presenceMap) {
      console.log(`  ${peerId}: ${JSON.stringify(data)}`);
    }
  });

  // Watch the peer list from Bob's perspective
  bob.peers$.subscribe((peers) => {
    console.log(`Bob sees ${peers.length} peer(s): ${peers.map((p) => p.name).join(", ")}`);
  });

  await sleep(200);

  // Set presence for each client
  console.log("\nAlice sets presence: { status: 'active', color: 'blue' }");
  alice.presence.set({ status: "active", color: "blue" });
  await sleep(300);

  console.log("Bob sets presence: { status: 'away', color: 'red' }");
  bob.presence.set({ status: "away", color: "red" });
  await sleep(300);

  // Update presence
  console.log("Alice updates presence: { status: 'typing', color: 'blue' }");
  alice.presence.set({ status: "typing", color: "blue" });
  await sleep(300);

  // Clean up
  await alice.disconnect();
  await bob.disconnect();
  console.log("\nDone.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
