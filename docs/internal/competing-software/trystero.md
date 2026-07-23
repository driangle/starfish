# Trystero

> Serverless WebRTC rooms that ride free public signaling — popular in creative coding.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Trystero is a small JS library that connects browsers into **peer-to-peer WebRTC rooms
without you running any signaling server**. It bootstraps the WebRTC handshake over free,
public infrastructure — BitTorrent trackers, Nostr, MQTT, Firebase, IPFS, or Supabase — then
hands you direct P2P data (and optional audio/video) channels. It's a darling of the
creative-coding / demoscene crowd because you can ship a multiplayer sketch with zero backend.

## How it works

- You pick a **strategy** (e.g. `trystero/torrent`, `trystero/nostr`, `trystero/mqtt`) that
  uses public infrastructure purely for **signaling** (peer discovery + SDP exchange).
- Peers in the same **room** (`joinRoom(config, roomId)`) establish direct WebRTC
  connections to each other — a mesh.
- You create named **actions** (`makeAction`) to send/receive typed messages; there are
  helpers for peer join/leave, latency, and streaming media.
- After signaling, traffic is **fully peer-to-peer** — no server sees the data.

## At a glance

| Axis | Trystero |
|------|----------|
| Category | Library (P2P) |
| Transport | WebRTC (data + media) |
| Deployment | "Serverless" — uses free public signaling; nothing you host |
| Presence | Via peer join/leave + your own action messages (DIY) |
| Pub/Sub | Room-scoped actions (send to all peers) |
| Shared-state model | None — you build sync on top of actions |
| Matchmaking | No — you must share/agree on a room id |
| Language & runtime | JS/TS, browser-only (WebRTC) |
| Licensing / cost | MIT — free; relies on free public infra |
| Creative-coding fit | Strong — beloved for zero-backend multiplayer sketches |

## Overlap with Starfish

- **WebRTC peer-to-peer data channels** — the most direct technical overlap.
- **Rooms** of peers exchanging messages.
- Both are squarely aimed at **creative coding / browser multiplayer**.

## Where Starfish differs / wins

- **A real protocol with structure.** Trystero gives you a P2P pipe and leaves presence,
  shared state, pub/sub topics, and matchmaking to you. Starfish provides all of them as
  first-class features.
- **Reliability and transport fallback.** Public-signaling P2P can fail behind strict NATs /
  corporate firewalls with no TURN; Starfish runs over WebSocket by default and uses WebRTC
  as an *optional* accelerator with fallback, so it degrades gracefully.
- **Server-side capabilities.** Persistent shared data, authoritative session state, and
  matchmaking pools need a server; Trystero has none by design.
- **Multi-language.** Trystero is browser-JS only; Starfish reaches Python, Go, Swift.

## Where it beats Starfish

- **Truly zero-infrastructure.** No server to run *at all* — the entire multiplayer layer is
  the library plus free public signaling. Unbeatable for demos, sketches, and throwaway
  experiments.
- **Full mesh P2P privacy/latency.** Data never touches a server you (or anyone) operates,
  which is great for privacy and for pure peer latency.
- **Tiny and dead-simple** for the "two browsers talking directly" case.

## Verdict

Trystero wins for **zero-backend, browser-only, P2P sketches** — when you want to ship a
multiplayer artwork with no server and don't need persistence, matchmaking, or non-JS
clients. Starfish wins when you need **structure and reliability**: presence, pub/sub, shared
state, matchmaking, graceful WS↔WebRTC fallback, and multi-language SDKs.

## How we position against this

"Trystero is a lovely zero-backend way to get browsers into a P2P WebRTC room using free
public signaling — perfect for sketches. But it's just a pipe: presence, shared state,
matchmaking, and reliable fallback are on you, and it's browser-JS only. Starfish gives you
those as protocol features, runs reliably over WebSocket with WebRTC as an accelerator, and
speaks four languages. Use Trystero for a quick no-server demo; use Starfish when the piece
needs to be robust and structured."
