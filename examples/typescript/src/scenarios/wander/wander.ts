// Wander Scenario
// ---------------
// A message in a bottle: one line of writing at a time, sent to a random
// stranger, with no feed, profile, or contacts.
//
// Run: npm run scenario:wander
// Requires: Starfish server running at ws://localhost:8080/starfish
//
// Three wanderers share a session. One knocks to see who's listening, then
// sends a note directly to whoever answers. The knock/reply handshake is
// correlated with an id carried in the message payload — per the protocol,
// application data belongs in `payload`, not the header.
//
// SDK features: send() to a specific peer, messages$, and a request/reply
//               (knock -> here -> note) handshake

import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";
import { randomUUID } from "node:crypto";

const SERVER_URL = "ws://localhost:8080/starfish";
const SESSION = "wander";

type Note = {
  kind: "knock" | "here" | "note";
  id: string; // correlation id: the knock's id, echoed by the reply
  hour?: number;
  text?: string;
};

function createClient(name: string) {
  return new StarfishClient({
    server: SERVER_URL,
    ws: (url) => new WebSocket(url) as any,
    client: { name },
  });
}

// Everyone answers a knock and receives notes. `pending` maps a knock id we
// sent to the stranger we're waiting to hear back from.
function wire(client: StarfishClient, label: string, pending: Map<string, string>) {
  client.messages$.subscribe((frame) => {
    const msg = frame.payload as Note | undefined;
    if (!msg) return;
    const from = frame.header.from!;

    if (msg.kind === "knock") {
      // Someone is knocking — answer, echoing their correlation id.
      client.send(from, { kind: "here", id: msg.id } satisfies Note);
    } else if (msg.kind === "here" && pending.has(msg.id)) {
      // Our knock was answered — send our one line.
      const target = pending.get(msg.id)!;
      pending.delete(msg.id);
      client.send(target, {
        kind: "note",
        id: msg.id,
        hour: new Date().getHours(),
        text: "the bakery just turned its lights on",
      } satisfies Note);
    } else if (msg.kind === "note") {
      console.log(`[${label}] note from a stranger (their hour ${msg.hour}): "${msg.text}"`);
    }
  });
}

async function main() {
  const names = ["ari", "mira", "sol"];
  const walkers = names.map(createClient);
  for (const w of walkers) {
    await w.connect();
    await w.join(SESSION);
  }
  console.log("Three wanderers are out walking.\n");

  const pendings = walkers.map(() => new Map<string, string>());
  walkers.forEach((w, i) => wire(w, names[i], pendings[i]));

  await sleep(200);

  // Ari knocks on a random other walker, then sends a note if they answer.
  const [ari] = walkers;
  const peers = ari.peers$.value;
  const stranger = peers[Math.floor(Math.random() * peers.length)];
  const id = randomUUID();
  pendings[0].set(id, stranger.id);
  console.log(`[ari] knocking on ${stranger.name ?? stranger.id}...`);
  ari.send(stranger.id, { kind: "knock", id } satisfies Note);

  await sleep(600);

  await Promise.all(walkers.map((w) => w.disconnect()));
  console.log("\nDone.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
