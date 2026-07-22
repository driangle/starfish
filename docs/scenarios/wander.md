# Wander

A message in a bottle. There's no feed, no profile, no followers — just one line of
writing at a time, sent to a random stranger somewhere in the world. You might keep the
note you receive, or write one line back into the dark for whoever wanders past next.

The piece leans on two Starfish features:

- **[Direct messaging](../cookbook/targeted-messaging)** so each note reaches exactly one person.
- **A [request/reply handshake](../cookbook/request-reply)** so a note only goes to someone who's actually listening.

**[Direct messaging](../cookbook/targeted-messaging) — one note, one reader.** Everyone wandering shares a session. To
send a note, pick a random person and send it straight to them; notes arrive one at a
time. Application data — the note text, the sender's local hour — travels in the
`payload`.

```ts
await client.join("wander");

function castNote(text) {
  const peers = client.peers$.value;
  if (peers.length === 0) return; // nobody out walking right now
  const stranger = peers[Math.floor(Math.random() * peers.length)];
  client.send(stranger.id, { kind: "note", text, hour: new Date().getHours() });
}

client.messages$.subscribe((frame) => {
  const msg = frame.payload;
  if (msg?.kind === "note") receiveNote(msg.text, msg.hour, frame.header.from);
});
```

**[Request/reply](../cookbook/request-reply) — knock before you write.** Some walkers want to send into the void;
others want a reply. A gentle handshake — knock, then wait for an answer — lets a note
go only to someone who's listening. The knock carries a correlation id in its payload,
and the reply echoes it back so the sender knows which knock was answered.

```ts
const pending = new Map(); // knock id -> stranger we're waiting on

function knock(strangerId) {
  const id = crypto.randomUUID();
  pending.set(id, strangerId);
  client.send(strangerId, { kind: "knock", id });
}

client.messages$.subscribe((frame) => {
  const msg = frame.payload;
  const from = frame.header.from;

  if (msg?.kind === "knock") {
    // Someone knocked — answer, echoing their id.
    client.send(from, { kind: "here", id: msg.id });
  } else if (msg?.kind === "here" && pending.has(msg.id)) {
    // Our knock was answered — write our one line.
    const strangerId = pending.get(msg.id);
    pending.delete(msg.id);
    client.send(strangerId, { kind: "note", id: msg.id, text: "the lights just came on" });
  }
});
```

Direct messaging gives each note a single reader; the knock/reply handshake makes sure
it reaches someone who's there to read it.
