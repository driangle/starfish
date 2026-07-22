// The Long Mural Scenario
// -----------------------
// A single endless canvas that anyone can draw on and that never resets.
// Strokes persist and merge cleanly when people draw at the same time.
//
// Run: npm run scenario:the-long-mural
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// Two painters draw onto shared tiles concurrently. Strokes are appended with
// list.add (no lost writes), a shared counter tracks the total, a private
// brush lives in the self scope, and a moderator clears a tile with an
// optimistic-concurrency version check.
//
// SDK features: save() with list.add / counter.add / replace, get(), key$(),
//               session vs self scope, expectedVersion

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";
const SESSION = "the-long-mural";
const TILE = "tile:0042:0017";

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const ada = createClient("painter-ada");
  const bo = createClient("painter-bo");

  await ada.connect();
  await bo.connect();
  await ada.join(SESSION);
  await bo.join(SESSION);
  console.log("Both painters joined the mural.\n");

  // Watch the tile and the running total redraw as strokes land.
  ada.key$(TILE).subscribe((result) => {
    const strokes = (result.data as unknown[]) ?? [];
    console.log(`[ada] ${TILE} now has ${strokes.length} stroke(s)`);
  });
  bo.key$("stroke-count").subscribe((result) => {
    console.log(`[bo] total strokes: ${result.data}`);
  });

  await sleep(200);

  // Both painters append to the same tile at once. list.add never overwrites.
  const stroke = (from: string, n: number) => ({ from, points: [[n, n]], color: "#333" });
  const paint = (client: StarfishClient, from: string, n: number) =>
    Promise.all([
      client.save({ key: TILE, scope: "session", op: "list.add", data: [stroke(from, n)] }),
      client.save({ key: "stroke-count", scope: "session", op: "counter.add", data: 1 }),
    ]);

  console.log("Both painters draw concurrently...");
  await Promise.all([paint(ada, "ada", 1), paint(bo, "bo", 2)]);
  await Promise.all([paint(ada, "ada", 3), paint(bo, "bo", 4)]);
  await sleep(300);

  const tile = await ada.get({ key: TILE, scope: "session" });
  console.log(`\nTile holds ${(tile.data as unknown[]).length} strokes (v${tile.version}).`);

  // Private per-painter settings live in the self scope.
  await ada.save({ key: "my-brush", scope: "self", op: "replace", data: { color: "#c94f7c" } });
  const brush = await ada.get({ key: "my-brush", scope: "self" });
  console.log(`[ada] private brush: ${JSON.stringify(brush.data)}`);

  // A moderator clears the tile, but only if nobody has touched it since the
  // read. The version check makes the overwrite safe.
  console.log("\n[moderator] clearing the tile with a version check...");
  const current = await bo.get({ key: TILE, scope: "session" });
  await bo.save({
    key: TILE,
    scope: "session",
    op: "replace",
    data: [],
    expectedVersion: current.version,
  });
  await sleep(300);

  await ada.disconnect();
  await bo.disconnect();
  console.log("\nDone.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
