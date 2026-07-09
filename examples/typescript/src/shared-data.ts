// Shared Data Example
// --------------------
// Demonstrates: collaborative state with save, get, key$, and optimistic concurrency
//
// Run: npm run shared-data
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// Two clients share a counter and a config object, demonstrating
// replace, counter.add, and merge operations with version tracking.

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
  const clientA = createClient("Client-A");
  const clientB = createClient("Client-B");

  await clientA.connect();
  await clientB.connect();
  await clientA.join("shared-data-demo");
  await clientB.join("shared-data-demo");
  console.log("Both clients joined session.\n");

  // Watch all data changes from Client-B's perspective
  clientB.changed$.subscribe((result) => {
    console.log(`[Client-B] Data changed: ${result.key} = ${JSON.stringify(result.data)} (v${result.version})`);
  });

  await sleep(200);

  // --- Replace operation: set a value ---
  console.log("Client-A sets 'config' to { theme: 'dark', fontSize: 14 }");
  const r1 = await clientA.save({
    key: "config",
    scope: "session",
    op: "replace",
    data: { theme: "dark", fontSize: 14 },
  });
  console.log(`  Saved at version ${r1.version}\n`);
  await sleep(300);

  // --- Merge operation: partial update ---
  console.log("Client-B merges { fontSize: 18 } into 'config'");
  const r2 = await clientB.save({
    key: "config",
    scope: "session",
    op: "merge",
    data: { fontSize: 18 },
  });
  console.log(`  Merged at version ${r2.version}\n`);
  await sleep(300);

  // --- Get operation: read current value ---
  const current = await clientA.get({ key: "config", scope: "session" });
  console.log(`Client-A reads 'config': ${JSON.stringify(current.data)} (v${current.version})\n`);

  // --- Counter operation ---
  console.log("Client-A initializes 'score' to 0");
  await clientA.save({ key: "score", scope: "session", op: "replace", data: 0 });
  await sleep(200);

  console.log("Client-A increments 'score' by 10");
  await clientA.save({ key: "score", scope: "session", op: "counter.add", data: 10 });
  await sleep(200);

  console.log("Client-B increments 'score' by 5");
  await clientB.save({ key: "score", scope: "session", op: "counter.add", data: 5 });
  await sleep(200);

  const score = await clientA.get({ key: "score", scope: "session" });
  console.log(`\nFinal score: ${score.data} (v${score.version})`);

  // --- Watch specific key ---
  console.log("\nClient-A watches 'status' key:");
  clientA.key$("status").subscribe((result) => {
    console.log(`  status updated to: ${JSON.stringify(result.data)}`);
  });

  await clientB.save({ key: "status", scope: "session", op: "replace", data: "ready" });
  await sleep(200);
  await clientB.save({ key: "status", scope: "session", op: "replace", data: "running" });
  await sleep(200);

  // Clean up
  await clientA.disconnect();
  await clientB.disconnect();
  console.log("\nDone.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
