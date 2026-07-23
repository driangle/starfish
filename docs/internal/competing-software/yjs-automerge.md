# Yjs / Automerge

> CRDT libraries for conflict-free shared state — the "shared data" overlap.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What they are

**Yjs** and **Automerge** are **CRDT libraries**: data structures that can be edited
concurrently (and offline) by many peers and always converge to the same value without a
central authority. They are *not* networking stacks — they define the merge semantics and
leave transport to you.

- **Yjs** — high-performance, mature, huge ecosystem; shared types (`Y.Map`, `Y.Array`,
  `Y.Text`, `Y.XmlFragment`) with pluggable network providers (`y-websocket`, `y-webrtc`,
  `y-partykit`, etc.) and an **awareness** protocol for presence.
- **Automerge** — CRDT with a JSON-like document model, rich change history, and a Rust core
  (`automerge-rs`) with JS and other bindings; `automerge-repo` adds sync/storage plumbing.

## How they work

- Each peer holds a local replica; edits produce **operations/updates** that are exchanged
  with other peers over whatever transport you wire up.
- Merges are **conflict-free**: concurrent edits combine deterministically, so peers can work
  offline and reconcile later.
- **Presence** in Yjs comes via the separate *awareness* protocol; Automerge leaves presence
  entirely to the app.
- There is **no server requirement** — a relay or peer transport is enough; state lives in
  the documents themselves.

## At a glance

| Axis | Yjs / Automerge |
|------|-----------------|
| Category | Library (CRDT) |
| Transport | Transport-agnostic (WS, WebRTC, anything) via providers |
| Deployment | Self-hostable / serverless — you provide transport + optional relay |
| Presence | Yjs: yes (awareness). Automerge: no (DIY) |
| Pub/Sub | No — not a messaging system |
| Shared-state model | **CRDT** (conflict-free, offline-capable) |
| Matchmaking | No |
| Language & runtime | Yjs: JS/TS (+ ports). Automerge: Rust core, JS/other bindings |
| Licensing / cost | OSS (Yjs: MIT-ish; Automerge: MIT) — free |
| Creative-coding fit | Moderate — great for shared *data*, not a whole realtime stack |

## Overlap with Starfish

- Both provide **shared, synchronized state** across participants — the single most direct
  overlap in this whole section.
- Yjs's awareness overlaps with Starfish **presence**.

## Where Starfish differs / wins

- **Complete realtime protocol vs. a data structure.** Yjs/Automerge give you *only* merge
  semantics; you still need signaling, rooms, presence wiring, pub/sub, matchmaking, and a
  server. Starfish provides all of that as one protocol with servers and SDKs.
- **Pub/sub, direct messaging, matchmaking, WebRTC transport, delivery controls** — none of
  which are in a CRDT library.
- **Multi-language, uniform API.** Starfish presents the same session/topic/presence/data
  model across TS, Python, Go, and Swift.

## Where it beats Starfish

- **Real conflict-free merging + offline-first.** This is the big one: two peers editing the
  same structure concurrently (or offline for hours) converge automatically. Starfish's
  shared data is **structured ops + `expectedVersion`** — on contention you re-read and
  retry; there is no automatic merge and no rich offline story. For collaborative text
  editing or long-lived offline documents, Yjs/Automerge are simply the right tool.
- **Edit history / time travel** (especially Automerge) that Starfish doesn't model.
- **Battle-tested at the algorithm level** for exactly this hard problem.

## Verdict

If your core need is **conflict-free concurrent editing of shared data** — collaborative
text, offline-first documents, automatic merge — use Yjs or Automerge (often *inside*
another transport). If you need a **whole realtime layer** — rooms, presence, pub/sub,
matchmaking, WebRTC, multi-language — Starfish is the better fit. They're complementary more
than competitive: you could even run a CRDT payload *over* Starfish transport.

## How we position against this

"Yjs and Automerge are CRDT libraries — the gold standard for conflict-free, offline-capable
shared data, but they're just the data layer: you still bring transport, rooms, presence,
and a server. Starfish is the full realtime protocol; its shared state is structured ops with
optimistic concurrency rather than a CRDT, so for heavy concurrent/offline editing a CRDT
wins — but for everything around the data (sessions, pub/sub, matchmaking, WebRTC, four SDKs)
Starfish does the job a library can't. They compose: you can carry CRDT updates over
Starfish."
