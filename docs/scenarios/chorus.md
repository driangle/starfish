# Chorus

A performance where the audience is the instrument. Everyone raises their phone, and
as the performer plays, hundreds of phones sound together — low voices on one side of
the room, high voices on the other, all landing on the same beat. The audience becomes
a choir spread across every seat.

The piece leans on three Starfish features:

- **[Presence](../cookbook/presence)** to sort phones into voices and show the performer the balance of the room.
- **[Broadcast](../cookbook/targeted-messaging)** to send each cue to every phone at once.
- **[Clock sync](../guide/workflows#synchronized-timing)** so all of them play on the same beat.

**[Presence](../cookbook/presence) — voices in the room.** Each phone picks a voice and announces it, and the
performer's screen shows how the sections fill up.

```ts
await client.join("chorus");
await client.clock.sync(); // aligns each phone to the shared beat

const myVoice = pickVoice(); // "bass" | "tenor" | "alto" | "soprano"
client.presence.set({ voice: myVoice });

// On the performer's client:
client.presence$.subscribe((room) => updateSectionMeters(tally(room, "voice")));
```

**[Broadcast](../cookbook/targeted-messaging) + [clock](../guide/workflows#synchronized-timing) — everyone on the beat.** The performer sends a cue to the whole
room: a voice, a note, and a moment just ahead. Every phone in that voice plays exactly
then.

```ts
// Performer's client:
function cue(voice, freq) {
  client.broadcast(
    { voice, freq, at: client.clock.now() + 500 }, // half a second ahead
    { delivery: { reliability: "latest" } },        // if the network lags, use the newest cue
  );
}

// On each phone:
client.messages$.subscribe((frame) => {
  const { voice, freq, at } = frame.payload;
  if (voice === myVoice || voice === "all") client.clock.at(at, () => playTone(freq));
});
```

The performer can also cut the whole room to silence, marking the cue
[`critical`](../guide/core-concepts#delivery-options) so a server can prioritize it over
ordinary traffic.

```ts
client.broadcast({ voice: "all", stop: true }, { priority: "critical" });
```

One performer, hundreds of phones, a single chord no speaker could make alone.
