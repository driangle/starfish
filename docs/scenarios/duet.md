# Duet

An app for moving with a stranger. You open it, start swaying with your phone in
hand, and moments later a second figure appears on screen mirroring your motion —
another person, somewhere else, paired with you automatically. No lobby, no invite,
no names. Just two people improvising together in real time.

The piece leans on three Starfish features:

- **[Pools](../cookbook/pool-auto-pairing)** to pair two people without a shared room name.
- **[WebRTC](../cookbook/webrtc-data-channels)** for a direct, low-latency link between them.
- **[Unreliable delivery](../cookbook/reliable-vs-unreliable)** so motion stays fluid instead of stuttering.

**[Pools](../cookbook/pool-auto-pairing) — automatic pairing.** A pool is a waiting area the server matches for you.
Enter looking for a partner, and Starfish hands you both a private session the moment
someone else is waiting too. The default `auto` mode pairs entrants by group size;
`create: true` lets whoever arrives first open the pool.

```ts
await client.join("duet-lobby");

client.pool.matched$.subscribe(async ({ session, peers }) => {
  await client.leave();       // leave the lobby
  await client.join(session); // enter the private duet session
  beginDuet(peers[0].id);
});

await client.pool.enter("duets", { groupSize: 2, create: true });
```

**[WebRTC](../cookbook/webrtc-data-channels) — a direct link.** Once paired, the two phones connect peer-to-peer, so
motion travels between them without a round trip through the server.

```ts
function beginDuet(partnerId) {
  client.connectRTC(partnerId);

  client.rtcPeers$?.subscribe((peers) => {
    const link = peers.find((p) => p.peerId === partnerId);
    if (link?.state === "connected") setStatus("dancing");
  });
}
```

**[Unreliable delivery](../cookbook/reliable-vs-unreliable) — keep it fluid.** Each frame of motion matters only for an
instant, so it's sent best-effort: a dropped frame is invisible, but a late one would
break the feeling of moving together.

```ts
onDeviceMotion((tilt) => {
  client.send(partnerId, { tilt }, {
    delivery: { reliability: "unreliable", preferTransport: "rtc", fallback: true },
  });
});

client.messagesFrom$(partnerId).subscribe((frame) => renderPartner(frame.payload.tilt));
```

Two strangers, matched by the room and connected directly, moving as a pair.
