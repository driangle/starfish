# Liveblocks

> Hosted collaborative presence + CRDT storage service for web apps.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Liveblocks is a **hosted service** for adding multiplayer collaboration to web apps:
real-time presence, live cursors, a CRDT-based **Storage** document, comments/notifications,
and text-editor bindings (Lexical, TipTap, BlockNote). You use their client SDK and hosted
infrastructure; there is no self-hosted server.

## How it works

- Clients authenticate to Liveblocks' cloud and join a **room**.
- **Presence** is a first-class API: each client sets ephemeral presence (cursor, selection)
  and subscribes to others'.
- **Storage** is a conflict-free document built from `LiveObject`, `LiveList`, and `LiveMap`
  — a CRDT that merges concurrent edits automatically and persists server-side.
- Higher-level products (Comments, Notifications, AI Copilots, editor integrations) sit on
  top of that core.
- Everything runs on Liveblocks' infrastructure; you pay per monthly active user / usage.

## At a glance

| Axis | Liveblocks |
|------|-----------|
| Category | Hosted service |
| Transport | WebSocket |
| Deployment | Hosted-only (no self-host) |
| Presence | Yes — best-in-class, first-class API |
| Pub/Sub | Yes — broadcast events + storage subscriptions |
| Shared-state model | **CRDT** (LiveObject/List/Map), auto-merge + server persistence |
| Matchmaking | No — you address rooms by id |
| Language & runtime | JS/TS (React-first), plus REST APIs; not multi-runtime clients |
| Licensing / cost | Proprietary SaaS; free tier + usage-based paid plans |
| Creative-coding fit | Moderate — superb for docs/design tools, web/React-centric |

## Overlap with Starfish

- **Presence** and **rooms** are core to both.
- Both provide a **shared synced state** primitive across a room.
- Both target **collaborative, multi-user** experiences.

## Where Starfish differs / wins

- **Self-hostable and open.** Liveblocks is hosted-only SaaS with per-MAU pricing; Starfish
  you run yourself with no per-user cost or vendor lock-in.
- **Transport neutrality + WebRTC.** Liveblocks is WebSocket-through-cloud; Starfish adds
  peer-to-peer WebRTC for latency-sensitive creative traffic.
- **Matchmaking and multi-language clients.** Pools and Python/Go/Swift SDKs have no
  Liveblocks equivalent (JS/React-centric).
- **Not document-shaped.** Liveblocks' sweet spot is document collaboration; Starfish suits
  performances, installations, and sketches that aren't a "document."

## Where it beats Starfish

- **True CRDT storage.** Automatic conflict-free merging with offline support and history —
  Starfish's structured-ops + `expectedVersion` model is *not* conflict-free and needs
  read-modify-retry on contention.
- **Turnkey product surface.** Live cursors, comments, notifications, and drop-in editor
  bindings mean you ship collaboration in an afternoon with zero backend.
- **Managed scale and persistence** with no ops.

## Verdict

Liveblocks wins for **web/React collaborative documents** where you want turnkey CRDT
storage, live cursors, comments, and zero infrastructure — and are fine paying per user on a
hosted service. Starfish wins when you need **self-hosting, WebRTC, matchmaking, non-JS
clients**, or your app is a live/creative experience rather than a document editor.

## How we position against this

"Liveblocks is a hosted, React-first collaboration service with excellent CRDT storage and
presence — but it's SaaS-only, priced per active user, and shaped around documents. Starfish
is a self-hostable, multi-language realtime protocol with presence, pub/sub, matchmaking, and
WebRTC. If you're building a Google-Docs-style editor and want it done fast, Liveblocks is
hard to beat; if you're building live/creative multiplayer you want to own and run, Starfish
fits. Note honestly: Liveblocks' storage is a real CRDT; Starfish's shared data is structured
ops with optimistic concurrency, not automatic merge."
