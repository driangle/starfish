// Chorus Scenario
// ---------------
// A performance where the audience is the instrument: hundreds of phones sound
// together, each assigned a voice, all landing on the same beat.
//
// Run: npm run scenario:chorus
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// This runs the performer plus several audience phones in one process. Phones
// announce their voice via presence; the performer broadcasts cues carrying a
// server timestamp; each phone plays its note at that exact moment using the
// synchronized clock.
//
// SDK features: presence.set(), presence$, broadcast() with latest delivery
//               and critical priority, clock.sync(), clock.now(), clock.at(),
//               messages$

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const SERVER_URL = "ws://localhost:8080/starfish";
const SESSION = "chorus";
const VOICES = ["bass", "tenor", "alto", "soprano"] as const;

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

async function main() {
  const performer = createClient("performer");
  const phones = VOICES.map((v) => createClient(`phone-${v}`));

  await performer.connect();
  await performer.join(SESSION);
  await performer.clock.sync();

  // The performer watches the room fill in by voice.
  performer.presence$.subscribe((room) => {
    const counts: Record<string, number> = {};
    for (const data of room.values()) {
      const voice = (data as { voice?: string })?.voice;
      if (voice) counts[voice] = (counts[voice] ?? 0) + 1;
    }
    if (Object.keys(counts).length > 0) {
      console.log(`[performer] room: ${JSON.stringify(counts)}`);
    }
  });

  // Bring the audience online. Each phone syncs, takes a voice, and plays cues
  // addressed to its voice at the scheduled server time.
  for (const [i, phone] of phones.entries()) {
    await phone.connect();
    await phone.join(SESSION);
    await phone.clock.sync();

    const myVoice = VOICES[i];
    phone.presence.set({ voice: myVoice });

    phone.messages$.subscribe((frame) => {
      const { voice, freq, at, stop } = (frame.payload ?? {}) as {
        voice?: string;
        freq?: number;
        at?: number;
        stop?: boolean;
      };
      if (stop) {
        console.log(`[phone-${myVoice}] stop`);
        return;
      }
      if (voice === myVoice || voice === "all") {
        phone.clock.at(at!, () => {
          console.log(`[phone-${myVoice}] play ${freq}Hz at local time ${Date.now()}`);
        });
      }
    });

    await sleep(150);
  }

  await sleep(200);

  // The performer cues each voice in turn, half a second ahead. `latest`
  // delivery means a lagging network skips to the newest cue.
  const freqs: Record<string, number> = { bass: 130, tenor: 196, alto: 261, soprano: 392 };
  for (const voice of VOICES) {
    performer.broadcast(
      { voice, freq: freqs[voice], at: performer.clock.now() + 500 },
      { delivery: { reliability: "latest" } },
    );
    await sleep(600);
  }

  // Cut the whole room to silence with a high-priority cue.
  console.log("[performer] silence");
  performer.broadcast({ voice: "all", stop: true }, { priority: "critical" });
  await sleep(300);

  await Promise.all([performer, ...phones].map((c) => c.disconnect()));
  console.log("Done.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
