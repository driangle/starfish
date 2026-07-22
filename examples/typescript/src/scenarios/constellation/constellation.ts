// Constellation Scenario
// -----------------------
// A public installation where each phone is a point of light on a projection
// wall, and the whole crowd pulses together at a synchronized moment.
//
// Run: npm run scenario:constellation
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This runs the whole piece in one process: a "wall" client plus several
// "phone" clients. The phones share their star via presence; the wall picks a
// moment a few seconds out and broadcasts it; every phone fires its pulse at
// the same server time using the synchronized clock.
//
// SDK features: presence.set(), presence$, peers$, broadcast(),
//               clock.sync(), clock.now(), clock.at(), messages$

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";
const SESSION = "plaza";
const PHONE_COUNT = 4;
const CROWD_THRESHOLD = 3; // pulse once this many phones have joined

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const wall = createClient("projection-wall");
  const phones = Array.from({ length: PHONE_COUNT }, (_, i) => createClient(`phone-${i + 1}`));

  await wall.connect();
  await wall.join(SESSION);
  await wall.clock.sync();

  // The wall draws the sky as phones appear and move.
  wall.presence$.subscribe((sky) => {
    const stars = [...sky.values()].filter((s) => s && "x" in (s as object));
    if (stars.length > 0) {
      console.log(`[wall] sky has ${stars.length} star(s)`);
    }
  });

  // When the crowd is big enough, schedule a shared pulse a few seconds ahead.
  const pulseDone = new Promise<void>((resolve) => {
    let scheduled = false;
    wall.peers$.subscribe((peers) => {
      if (peers.length >= CROWD_THRESHOLD && !scheduled) {
        scheduled = true;
        const at = wall.clock.now() + 2000;
        console.log(`[wall] crowd reached ${peers.length}; broadcasting pulse at ${at}`);
        wall.broadcast({ kind: "pulse", at });
        // Give the phones time to fire before we tear down.
        setTimeout(resolve, 3000);
      }
    });
  });

  // Bring the phones online. Each syncs its clock, places a star, and waits
  // for the pulse cue.
  for (const [i, phone] of phones.entries()) {
    await phone.connect();
    await phone.join(SESSION);
    await phone.clock.sync();

    phone.presence.set({ hue: (i * 90) % 360, x: Math.random(), y: Math.random() });

    phone.messages$.subscribe((frame) => {
      if (frame.payload?.kind === "pulse") {
        const at = frame.payload.at as number;
        phone.clock.at(at, () => {
          console.log(`[${phone.clientId}] pulse fired at local time ${Date.now()}`);
        });
      }
    });

    await sleep(150);
  }

  await pulseDone;

  await Promise.all([wall, ...phones].map((c) => c.disconnect()));
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
