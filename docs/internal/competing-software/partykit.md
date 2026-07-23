# PartyKit

> Edge-hosted stateful realtime rooms built on Cloudflare Durable Objects.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

PartyKit is a framework and platform for building realtime multiplayer apps as **"parties"**
— stateful server objects, each backing a room, that run at the edge on Cloudflare Durable
Objects. You write a small server class with `onConnect`/`onMessage` handlers; PartyKit
deploys it globally and gives every room a persistent, single-threaded server instance.

## How it works

- Each room maps to one **Durable Object**: a single-threaded, stateful server that holds
  in-memory state and can persist to storage. All connections for a room hit the same
  object, which makes coordination simple.
- Clients connect over WebSocket; your server broadcasts to connected sockets.
- It has first-class recipes for **Yjs** (`y-partykit`) so it's a common backend for
  collaborative CRDT apps.
- It's **edge-hosted** — you don't run servers, you deploy to PartyKit/Cloudflare. (PartyKit
  is now part of Cloudflare.)

## At a glance

| Axis | PartyKit |
|------|----------|
| Category | Framework + hosted platform (edge) |
| Transport | WebSocket (HTTP too) |
| Deployment | Hosted-only (Cloudflare edge; not designed to self-host) |
| Presence | DIY — easy to build on connection state, not a built-in API |
| Pub/Sub | Yes — broadcast within a room |
| Shared-state model | Server-authoritative per-room state; CRDT via `y-partykit` |
| Matchmaking | No — you address rooms by id |
| Language & runtime | Server: TS/JS (Workers runtime). Clients: JS/TS (partysocket), any WS client |
| Licensing / cost | OSS client libs; platform is usage-based hosting |
| Creative-coding fit | Moderate — great for web collab, tied to Cloudflare/JS |

## Overlap with Starfish

- **Room-per-connection model** — PartyKit "parties" and Starfish sessions both group
  clients and fan out messages.
- Both are strong fits for **browser-based collaborative apps**.
- Both can back **shared state** (PartyKit via Yjs; Starfish via its own structured ops).

## Where Starfish differs / wins

- **Self-hostable and transport-neutral.** PartyKit is fundamentally a Cloudflare-hosted
  product; Starfish you run yourself, anywhere, and it can use WebRTC P2P.
- **Batteries included.** Presence, pub/sub topics, matchmaking pools, and shared data are
  protocol features in Starfish; in PartyKit you write the server logic (or bolt on Yjs)
  for each.
- **Multi-language SDKs.** PartyKit is JS/Workers-centric; Starfish has Python, Go, and
  Swift clients too.

## Where it beats Starfish

- **Zero-ops global edge.** You get a stateful server per room deployed worldwide with no
  infrastructure to run — genuinely excellent DX for web apps.
- **Durable per-room compute.** A single-threaded authoritative object per room is a clean
  model for server-side logic and persistence that Starfish's peer model doesn't give you.
- **First-class Yjs hosting** for CRDT collaboration.

## Verdict

PartyKit wins when you want **zero-ops, edge-hosted, server-authoritative rooms** for a web
app and are happy on Cloudflare/JS — especially for Yjs-backed collaboration. Starfish wins
when you need **self-hosting, WebRTC, matchmaking, and multi-language clients**, or you don't
want to be tied to a single cloud.

## How we position against this

"PartyKit gives you a stateful server per room, hosted on Cloudflare's edge — brilliant DX,
but hosted-only, JS-only, and you write the room logic. Starfish is a self-hostable protocol
with presence, pub/sub, matchmaking, and shared state built in, clients in four languages,
and optional WebRTC. Pick PartyKit for zero-ops edge web apps; pick Starfish when you need to
own the deployment or go peer-to-peer."
