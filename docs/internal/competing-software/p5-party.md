# p5.party

> p5.js-native shared state for multiplayer sketches. See the [overview](./index.md) and
> shared [axes](./axes.md).

## What it is

p5.party is a small library that brings **shared, synced state to p5.js sketches** with an
API designed to feel native to p5. You call `partyConnect()` in `setup()`, then read and
write **shared objects** (`partyLoadShared`) that automatically synchronize across everyone
in the same room. It's purpose-built for teaching and for making quick collaborative p5
sketches, and is widely used in creative-coding classrooms.

## How it works

- Under the hood it uses a **Deepstream** realtime server (a public instance by default, or
  your own) as the sync backend.
- `partyLoadShared(name)` returns a plain JS object; **mutating its properties broadcasts**
  the change to all peers, and incoming changes mutate it back — so shared state reads like
  ordinary object access inside `draw()`.
- Helpers like `partyLoadMyShared` (per-participant state, good for presence-style data) and
  guest/host tracking cover common sketch patterns.
- The whole design goal is **minimal ceremony** so students focus on the sketch, not networking.

## At a glance

| Axis | p5.party |
|------|----------|
| Category | Library (p5.js-specific) |
| Transport | WebSocket (via Deepstream) |
| Deployment | Public Deepstream server by default; self-hostable Deepstream |
| Presence | Via per-participant shared objects (DIY-ish) |
| Pub/Sub | No — it's shared-object sync, not topics |
| Shared-state model | Last-write-wins on shared record fields |
| Matchmaking | No — you pick a room name |
| Language & runtime | JS + p5.js, browser-only |
| Licensing / cost | OSS (free); public server or your own Deepstream |
| Creative-coding fit | Strong — purpose-built for p5 multiplayer sketches |

## Overlap with Starfish

- Squarely the **same audience**: creative coders making multiplayer sketches.
- **Shared state** synced across a room is the core of both.
- Starfish even ships a **p5.js adapter**, so the two meet on the same turf.

## Where Starfish differs / wins

- **Scope and robustness.** p5.party is a focused teaching library with last-write-wins
  shared objects; Starfish is a full protocol with presence, pub/sub topics, structured data
  ops with version guards, matchmaking, WebRTC, and reliability controls.
- **Transport neutrality + WebRTC** for low-latency traffic; p5.party is WebSocket via
  Deepstream only.
- **Multi-language and multi-runtime.** p5.party is browser p5 only; Starfish spans TS,
  Python, Go, Swift and integrates with Three.js and TouchDesigner too — useful when a sketch
  must talk to a non-browser controller or visual engine.
- **Concurrency safety.** `expectedVersion` guards vs. plain LWW field writes.

## Where it beats Starfish

- **Unbeatable simplicity for p5 beginners.** "Mutate a shared object and everyone sees it"
  is about as gentle an on-ramp as multiplayer gets — ideal for classrooms and quick sketches.
- **Zero setup** with the default public server.
- **Perfectly idiomatic p5** — nothing extra to learn if you already think in `setup()`/`draw()`.

## Verdict

p5.party wins for **teaching and quick p5 sketches** where the gentlest possible API and
zero setup matter more than robustness, matchmaking, or non-browser clients. Starfish wins
when a p5 project needs to **grow up** — reliability, presence, pub/sub, matchmaking, WebRTC,
or interop with Python/Go/Swift/TouchDesigner — while still offering a p5 adapter for the same
ergonomics.

## How we position against this

"p5.party is the friendliest way to add shared state to a p5 sketch — mutate an object,
everyone sees it — and it's perfect for classrooms. It's also just that: last-write-wins
shared objects over a Deepstream server, browser-p5 only. Starfish covers the same audience
(and ships a p5 adapter) but scales up to presence, pub/sub, matchmaking, WebRTC, version-safe
data, and non-browser runtimes. Start on p5.party; move to Starfish when the piece needs to be
robust or reach beyond the browser."
