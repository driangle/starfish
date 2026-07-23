# Comparison Axes

> **Internal reference — not published.** This file defines the axes used on every
> [Competing Software](./index.md) page so comparisons stay consistent and honest. When
> you add a new solution page, apply *these* axes in its **At a glance** table — don't
> invent new ones.

Each solution page includes an **At a glance** table scoring the solution against the
axes below. The same axes describe Starfish itself, so the matrix in the
[overview](./index.md) is apples-to-apples.

## The axes

| # | Axis | What it captures | Typical values |
|---|------|------------------|----------------|
| 1 | **Category** | What kind of thing it is — this drives most of the honest comparison, because a protocol, a library, and a hosted service are not really substitutes. | protocol · library · framework · hosted service |
| 2 | **Transport** | The wire(s) it runs over. | WebSocket · WebRTC · both · other (UDP/HTTP/TCP) |
| 3 | **Deployment** | Where it can run. | self-hostable · hosted-only · both |
| 4 | **Presence** | Built-in ephemeral "who's here / what are they doing" state. | yes · no · partial |
| 5 | **Pub/Sub** | Named channels / topics with fan-out to subscribers. | yes · no |
| 6 | **Shared-state model** | How concurrent writes to shared data are reconciled. | none · last-write-wins (LWW) · structured-ops + versioning · CRDT · OT · server-authoritative |
| 7 | **Matchmaking** | Built-in queue/lobby that pairs strangers into a room. | yes · no |
| 8 | **Language & runtime coverage** | Official client/server language support. | list of languages/runtimes |
| 9 | **Licensing / cost** | How you pay — code license and/or hosting model. | OSS license · free self-host · paid tiers · usage-based |
| 10 | **Creative-coding fit** | How well it suits sketches, live performance, and installations (latency tolerance, browser-first, hobbyist ergonomics, non-game domains). | strong · moderate · weak |

## Where Starfish sits on these axes

For reference, this is Starfish measured against the same axes. Every per-solution page
compares back to this baseline.

| Axis | Starfish |
|------|----------|
| Category | **Protocol** (with reference servers + multi-language SDKs) |
| Transport | **Both** — WebSocket, with optional WebRTC data channels |
| Deployment | **Self-hostable** (open source; no hosted offering required) |
| Presence | **Yes** — per-client ephemeral state (8 KB/client) |
| Pub/Sub | **Yes** — topics within a session |
| Shared-state model | **Structured ops + optimistic-concurrency versioning** — `replace`/`merge`/`set.*`/`list.*`/`counter.*`/`delete` with `expectedVersion` guards. *Not* true CRDT convergence. |
| Matchmaking | **Yes** — pools with `auto`/`claim`/`mutual`/`propose`/`delegated` modes |
| Language & runtime | SDKs: **TypeScript, Python, Go, Swift**; servers: **TypeScript, Go, Python**; adapters: **p5.js, Three.js, TouchDesigner** |
| Licensing / cost | **Open source, self-hostable** — license not yet declared |
| Creative-coding fit | **Strong** — this is the design target |

> **Honest caveat carried across all pages:** Starfish's shared data is *structured
> operations with optimistic concurrency*, not conflict-free replicated data. Two clients
> editing the same key concurrently rely on `expectedVersion` (read-modify-retry) rather
> than automatic merge. When a comparison touches offline editing or automatic conflict
> resolution, say so plainly — that's a genuine strength of the CRDT tools (Yjs, Automerge,
> Liveblocks).
