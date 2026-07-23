# Croquet / Multisynq

> Deterministic synchronized multiplayer — same logic runs identically on every client.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Croquet (and its successor **Multisynq**, which carries the same architecture forward) is a
**synchronized-computation** platform for multiplayer. Instead of sending state diffs, it
guarantees that identical **application logic runs deterministically on every client**, driven
by a shared, ordered stream of events from a lightweight reflector. If every client runs the
same code on the same inputs in the same order, they stay perfectly in sync with no
hand-written networking code.

## How it works

- App code is split into a **Model** (deterministic, synchronized — the shared simulation)
  and a **View** (local, per-client rendering/input).
- A hosted **reflector** timestamps and totally-orders events, then broadcasts them to all
  clients; it holds **no application state** — it just sequences events.
- Every client's Model executes the same events in the same order, so all replicas compute
  identical state. New joiners get a snapshot and catch up.
- You essentially never write "send this update" code — you write local logic and publish
  events; synchronization is automatic.

## At a glance

| Axis | Croquet / Multisynq |
|------|---------------------|
| Category | Framework + hosted synchronization service |
| Transport | WebSocket (to reflector) |
| Deployment | Hosted-only reflector network (you don't run it) |
| Presence | DIY on top of the synced model |
| Pub/Sub | Event publish/subscribe within the shared model |
| Shared-state model | **Deterministic synchronized computation** (not diff-sync, not CRDT) |
| Matchmaking | No — you join a named/keyed session |
| Language & runtime | JS/TS (browser-first); Unity/other bindings for Multisynq |
| Licensing / cost | SDK free/OSS-ish; reflector network is a hosted/keyed service |
| Creative-coding fit | Strong — explicitly courts creative/interactive multiplayer |

## Overlap with Starfish

- Both target **realtime multiplayer for interactive/creative apps** over WebSocket.
- Both give you **sessions** and an **event** model.
- Both aim to spare you from writing low-level networking.

## Where Starfish differs / wins

- **Fundamentally different model.** Croquet requires your logic to be **deterministic** and
  structured into Model/View — a powerful but demanding paradigm. Starfish makes no such
  demand: you send messages, set presence, and write shared data explicitly with ordinary
  code.
- **Self-hostable + transport-neutral.** Croquet depends on its hosted reflector network;
  Starfish you run yourself and can use WebRTC P2P.
- **Presence, pub/sub, matchmaking, shared data, delivery controls** as explicit protocol
  features rather than emergent properties of a synced simulation.
- **Multi-language SDKs** beyond browser JS.

## Where it beats Starfish

- **Perfect, effortless sync of complex state.** For a rich shared simulation (physics, a
  world, a complex interactive scene), determinism keeps *everything* in sync with essentially
  zero networking code — something Starfish's explicit ops can't match at that granularity.
- **No state on the server** means strong consistency without an authoritative-state bottleneck
  and trivial late-join catch-up.
- **Elegant for the right problem** — genuinely less code for deeply shared worlds.

## Verdict

Croquet/Multisynq wins when you have a **complex, deeply shared simulation** and can embrace
deterministic Model/View programming on their hosted reflector — the payoff is near-magical
sync with minimal networking code. Starfish wins when you want an **explicit, self-hostable,
transport-neutral protocol** with presence/pub-sub/matchmaking, ordinary (non-deterministic)
code, and multi-language clients.

## How we position against this

"Croquet/Multisynq keeps clients in sync by running identical deterministic logic everywhere,
sequenced by a hosted reflector — magical for complex shared worlds, but it requires the
deterministic Model/View paradigm and their hosted network. Starfish is an explicit protocol:
you send messages and write shared state with normal code, self-host it, and can go
peer-to-peer. Choose Croquet for a tightly-shared simulation; choose Starfish for a flexible,
self-owned realtime layer."
