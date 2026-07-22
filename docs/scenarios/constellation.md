# Constellation

A public installation built around a large projection wall. Anyone nearby opens the
app on their phone and becomes a point of light on the wall, placing themselves with
a touch. As the crowd grows the wall fills with stars, and every so often the whole
sky pulses at once — a shared moment that only works because everyone's phone acts
together.

The piece leans on three Starfish features:

- **[Presence](../cookbook/presence)** to place and move each person's star.
- **[Broadcast](../cookbook/targeted-messaging)** to send a single cue to the whole crowd.
- **[Clock sync](../guide/workflows#synchronized-timing)** so that cue lands on every phone at the same instant.

**[Presence](../cookbook/presence) — each phone is a star.** Presence shares a phone's current position and
color with everyone. When someone moves, their star moves; when they leave, it
disappears.

```ts
await client.join("plaza");
await client.clock.sync(); // aligns this phone with server time for the shared pulse

client.presence.set({ hue: myHue, x: myStar.x, y: myStar.y });

client.presence$.subscribe((sky) => {
  clearCanvas();
  for (const [id, star] of sky) {
    drawStar(star.x, star.y, star.hue, { self: id === client.clientId });
  }
});
```

**[Broadcast](../cookbook/targeted-messaging) + [clock](../guide/workflows#synchronized-timing) — the shared pulse.** The projection wall runs its own client.
Once the crowd is big enough, it picks a moment a few seconds out and broadcasts it to
everyone.

```ts
// On the projection wall's client:
client.peers$.subscribe((peers) => {
  if (peers.length >= 12 && !pulseScheduled) {
    pulseScheduled = true;
    client.broadcast({ kind: "pulse", at: client.clock.now() + 3000 });
  }
});
```

Because the cue is a shared server timestamp and every phone synced its clock on join,
`client.at` fires the animation at the same real moment on all of them.

```ts
client.messages$.subscribe((frame) => {
  if (frame.payload.kind === "pulse") {
    client.clock.at(frame.payload.at, () => {
      pulseMyStar();
      launchShootingStar();
    });
  }
});
```

The result is a crowd of strangers whose phones briefly move as one.
