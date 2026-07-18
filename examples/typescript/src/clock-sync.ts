// Clock Sync Example
// -------------------
// Demonstrates: synchronized timing across clients using the Clock API
//
// Run: npm run clock-sync
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// Two clients sync their clocks with the server, then compare their
// synchronized time to show they agree on "now" despite network latency.

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
  await clientA.join("clock-demo");
  await clientB.join("clock-demo");
  console.log("Both clients connected.\n");

  // Show local time vs synced time before sync
  console.log("Before sync:");
  console.log(`  Client-A local time:  ${Date.now()}`);
  console.log(`  Client-A synced time: ${clientA.clock.now()}`);
  console.log(`  Client-A offset:      ${clientA.clock.offset}ms\n`);

  // Sync both clients' clocks with the server
  // sync() takes multiple round-trip samples (default: 5) and computes the median offset
  console.log("Syncing clocks (5 samples each)...");
  const offsetA = await clientA.clock.sync();
  const offsetB = await clientB.clock.sync();

  console.log(`  Client-A offset: ${offsetA}ms`);
  console.log(`  Client-B offset: ${offsetB}ms`);
  console.log(`  Difference:      ${Math.abs(offsetA - offsetB)}ms\n`);

  // Compare synchronized times -- they should be very close
  const timeA = clientA.clock.now();
  const timeB = clientB.clock.now();
  console.log("After sync:");
  console.log(`  Client-A synced time: ${timeA}`);
  console.log(`  Client-B synced time: ${timeB}`);
  console.log(`  Difference:           ${Math.abs(timeA - timeB)}ms\n`);

  // Schedule a callback at a specific server time
  // Both clients schedule the same server time -- they should fire at nearly the same moment
  const targetTime = clientA.clock.now() + 1000; // 1 second from now
  console.log(`Scheduling callback at server time ${targetTime} (1 second from now)...`);

  await new Promise<void>((resolve) => {
    let fired = 0;
    clientA.clock.at(targetTime, () => {
      console.log(`  Client-A fired at local time ${Date.now()}`);
      if (++fired === 2) resolve();
    });
    clientB.clock.at(targetTime, () => {
      console.log(`  Client-B fired at local time ${Date.now()}`);
      if (++fired === 2) resolve();
    });
  });

  console.log("");
  await clientA.disconnect();
  await clientB.disconnect();
  console.log("Done.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
