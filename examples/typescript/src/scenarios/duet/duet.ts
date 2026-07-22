// Duet Scenario
// -------------
// An app for moving with a stranger: two people are paired automatically and
// exchange motion in real time.
//
// Run: npm run scenario:duet
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This runs both dancers in one process. They enter a pool and the server
// pairs them into a private session, then stream motion to each other with
// unreliable delivery.
//
// Note on transport: in a browser deployment the motion channel would be
// WebRTC (preferTransport: "rtc"), opened with client.connectRTC(). WebRTC
// needs a peer-connection factory that isn't available in plain Node, so this
// demo relies on the automatic WebSocket fallback (fallback: true). The
// delivery semantics are identical; only the underlying transport differs.
//
// SDK features: pool.enter(), pool.matched$, send() with unreliable delivery,
//               messagesFrom$()

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const SERVER_URL = "ws://localhost:8080/starfish";
const LOBBY = "duet-lobby";
// Unique per run so leftover members from a previous run can't pair with us.
const POOL = `duets-${randomUUID().slice(0, 8)}`;
const FRAMES = 5;

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const a = createClient("dancer-a");
  const b = createClient("dancer-b");

  await a.connect();
  await b.connect();
  await a.join(LOBBY);
  await b.join(LOBBY);
  console.log("Both dancers waiting in the lobby.");

  // Each dancer waits to be matched, then joins the private session.
  const matched = (client: StarfishClient, label: string) =>
    new Promise<string>((resolve) => {
      client.pool.matched$.subscribe(async (event) => {
        console.log(`[${label}] matched with ${event.peers.map((p) => p.id).join(", ")}`);
        await client.leave();
        await client.join(event.session);
        resolve(event.peers[0].id);
      });
    });

  const partnerOfA = matched(a, "dancer-a");
  const partnerOfB = matched(b, "dancer-b");

  // `auto` mode (the default) pairs entrants automatically by group size.
  // `create: true` lets whichever dancer arrives first open the pool.
  await a.pool.enter(POOL, { groupSize: 2, create: true });
  await b.pool.enter(POOL, { groupSize: 2, create: true });

  const [aPartner, bPartner] = await Promise.all([partnerOfA, partnerOfB]);

  // Each dancer renders the other's incoming motion.
  a.messagesFrom$(aPartner).subscribe((frame) => {
    console.log(`[dancer-a] sees partner tilt ${JSON.stringify(frame.payload?.tilt)}`);
  });
  b.messagesFrom$(bPartner).subscribe((frame) => {
    console.log(`[dancer-b] sees partner tilt ${JSON.stringify(frame.payload?.tilt)}`);
  });

  await sleep(200);

  // Stream a few frames of motion each. Motion is best-effort: a dropped frame
  // is invisible, a late one would break the feeling of moving together.
  const delivery = {
    reliability: "unreliable" as const,
    ordering: "unordered" as const,
    preferTransport: "rtc" as const,
    fallback: true,
  };

  for (let i = 0; i < FRAMES; i++) {
    a.send(aPartner, { tilt: { x: Math.round(Math.sin(i) * 100) / 100 } }, { delivery });
    b.send(bPartner, { tilt: { x: Math.round(Math.cos(i) * 100) / 100 } }, { delivery });
    await sleep(200);
  }

  await sleep(200);
  await a.disconnect();
  await b.disconnect();
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
