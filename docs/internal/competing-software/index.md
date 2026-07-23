# Competing Software

> **Internal positioning reference — not published to the public site.**
> This section maps the realtime / multiplayer landscape against Starfish. It is meant to
> be *factual and two-sided*: every page names where the alternative is the better choice,
> not just where Starfish wins. Use it for team onboarding, sales/positioning notes, and
> README framing — but keep it internal.

## What Starfish is (the baseline)

Starfish is a **transport-neutral realtime protocol for creative coding**. It provides
sessions, pools (matchmaking), topics (pub/sub), presence, and shared structured state over
WebSocket with optional WebRTC data channels, with SDKs in TypeScript, Python, Go, and
Swift. It is open source and self-hostable. See the full baseline on the
[Comparison Axes](./axes.md) page.

The single most important framing for every comparison: **Starfish is a protocol**, not a
game engine, not a hosted service, and not a CRDT library. Most "competitors" are actually
one of those three things and overlap only partially.

## How to read the per-solution pages

Every page follows the same template:

1. **What it is** — a neutral description.
2. **How it works** — the mechanics.
3. **At a glance** — the solution scored against the shared [axes](./axes.md).
4. **Overlap with Starfish** — where they genuinely compete.
5. **Where Starfish differs / wins** — our advantages, honestly scoped.
6. **Where it beats Starfish** — cases where you should reach for the alternative.
7. **Verdict** — the one-paragraph takeaway.
8. **How we position against this** — a short blurb for team/sales/README use.

The axes are defined **once** on the [Comparison Axes](./axes.md) page and applied
uniformly everywhere.

## Comparison matrix

Rows are solutions; columns are the most differentiating axes. `both` means WS + WebRTC.
"Shared state" uses the vocabulary from [axes.md](./axes.md#the-axes). See each page for
the full breakdown and the honest tradeoffs.

| Solution | Category | Transport | Deploy | Presence | Pub/Sub | Shared state | Matchmaking | Creative-coding fit |
|----------|----------|-----------|--------|----------|---------|--------------|-------------|---------------------|
| **[Starfish](./axes.md#where-starfish-sits-on-these-axes)** | protocol | both | self-host | yes | yes | structured-ops + versioning | yes | strong |
| [Colyseus](./colyseus.md) | framework | WebSocket | self-host / hosted | partial | via schema | server-authoritative | yes | moderate |
| [Nakama](./nakama.md) | framework/service | WebSocket | self-host / hosted | yes | yes | authoritative / relayed | yes (rich) | moderate |
| [PartyKit](./partykit.md) | framework/service | WebSocket | hosted (edge) | DIY | yes | server-authoritative (DO) | no | moderate |
| [Liveblocks](./liveblocks.md) | hosted service | WebSocket | hosted-only | yes | yes | CRDT | no | moderate |
| [Yjs / Automerge](./yjs-automerge.md) | library | transport-agnostic | self-host | via awareness | no | CRDT | no | moderate |
| [Trystero](./trystero.md) | library | WebRTC | serverless* | via actions | rooms | none | no | strong |
| [Croquet / Multisynq](./croquet-multisynq.md) | service/framework | WebSocket | hosted-only | DIY | via events | deterministic sync | no | strong |
| [p5.party](./p5-party.md) | library | WebSocket (Deepstream) | hosted/self-host | via shared | no | LWW (shared record) | no | strong |
| [Socket.IO](./socketio.md) | library | WebSocket | self-host | DIY | rooms/events | none | no | moderate |
| [Ably / Pusher](./ably-pusher.md) | hosted service | WebSocket | hosted-only | yes | yes | none | no | moderate |
| [Supabase Realtime](./supabase-realtime.md) | hosted service | WebSocket | self-host / hosted | yes | yes | none (Postgres CDC) | no | moderate |
| [Photon / Normcore](./photon-normcore.md) | service/SDK | UDP / WebSocket | hosted-only | yes | via events | authoritative / sync | yes (Photon) | weak (Unity-first) |
| [PeerJS / simple-peer](./peerjs-simple-peer.md) | library | WebRTC | self-host signaling | no | no | none | no | moderate |
| [OSC](./osc.md) | protocol | UDP/TCP | n/a | no | address patterns | none | no | weak (LAN) → strong (installations) |

\* Trystero rides free public signaling infrastructure (BitTorrent trackers, Nostr, MQTT,
etc.); it needs no server you run, but it isn't truly "no infrastructure."

## Quick mental model

- **Game-server frameworks** (Colyseus, Nakama, Photon, Normcore) — heavier, authoritative,
  built for games. Starfish is lighter and browser/creative-first.
- **CRDT stack** (Yjs, Automerge, Liveblocks) — best-in-class offline/concurrent editing.
  Starfish deliberately does *not* try to be a CRDT engine.
- **Hosted pub/sub** (Ably, Pusher, Supabase Realtime) — reliable managed channels, but no
  matchmaking, no WebRTC, hosted-only (mostly). Starfish is self-hostable and P2P-capable.
- **P2P/creative-native** (Trystero, PeerJS/simple-peer, Croquet, p5.party, OSC) — closest
  in spirit; Starfish offers a more complete, multi-language, transport-neutral protocol.
