# Nakama

> Open-source game backend server: matchmaking, presence, realtime, plus accounts,
> storage, and social features. See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Nakama (by Heroic Labs) is a full **game backend server** written in Go, backed by
CockroachDB/PostgreSQL. It bundles user accounts, friends, groups, chat, leaderboards,
storage, and a realtime layer with matchmaking and presence. It's a "batteries-included"
server you self-host (or run on Heroic Cloud) and extend with server-side runtime code in
Lua, Go, or TypeScript.

## How it works

- Clients connect via a **socket** (WebSocket or rUDP) and interact with realtime features:
  **match** handlers, **chat channels**, **presence** events, and a **matchmaker**.
- **Authoritative multiplayer** matches run server-side handlers you write; **relayed**
  matches let clients broadcast to each other without server logic.
- A rich **matchmaker** supports queries, properties, min/max counts, and interval-based
  matching.
- Everything sits alongside persistent systems: accounts, storage engine, leaderboards,
  notifications, in-app purchase validation.

## At a glance

| Axis | Nakama |
|------|--------|
| Category | Framework / self-hostable service (full backend) |
| Transport | WebSocket + rUDP |
| Deployment | Self-hostable (OSS) + Heroic Cloud |
| Presence | Yes — first-class presence events on matches/channels |
| Pub/Sub | Yes — chat channels + match data broadcast |
| Shared-state model | Server-authoritative matches or relayed (no built-in CRDT) |
| Matchmaking | Yes — rich, query-based matchmaker |
| Language & runtime | Server runtime: Go, Lua, TS. Clients: Unity, Unreal, JS, Godot, Cocos, C++, and more |
| Licensing / cost | Apache-2.0 (self-host) + paid managed cloud |
| Creative-coding fit | Moderate — powerful but heavyweight; game-account-centric |

## Overlap with Starfish

- **Presence and pub/sub** (channels) are first-class in both.
- **Matchmaking** is a headline feature of both.
- Both offer **realtime rooms** clients join and exchange messages in.

## Where Starfish differs / wins

- **Scope and weight.** Nakama is an entire backend platform (DB, accounts, IAP,
  leaderboards). Starfish is a focused realtime protocol you drop into an existing app —
  no database, no account system to adopt.
- **WebRTC peer-to-peer.** Nakama routes through the server; Starfish can go P2P over WebRTC
  data channels for low-latency creative traffic.
- **Browser/creative-first ergonomics.** Nakama's model centers on game accounts, sessions,
  and social graphs; Starfish's model centers on ephemeral creative sessions and sketches.
- **Simpler ops.** Nakama needs a CockroachDB/Postgres cluster; a Starfish server is a
  lightweight process.

## Where it beats Starfish

- **Full backend in one box.** If you also need auth, persistent player data, leaderboards,
  friends, and chat, Nakama gives you all of it — Starfish gives you none of it.
- **Scale and battle-testing** for large multiplayer games, with a mature matchmaker and
  authoritative match handlers.
- **Native engine clients** (Unity, Unreal, Godot) that Starfish doesn't target.

## Verdict

Nakama wins when you need a **complete game backend** — persistence, accounts, social, and
realtime — and are willing to run and operate it. Starfish wins when you need only the
**realtime creative layer**, want it embeddable and low-ops, and value WebRTC and
browser-native ergonomics over a full platform.

## How we position against this

"Nakama is a full game backend — accounts, storage, leaderboards, chat, and realtime, on top
of a database you operate. Starfish is just the realtime protocol: sessions, presence,
pub/sub, shared state, and matchmaking, self-hosted as a light process with optional WebRTC.
Choose Nakama when you want the whole platform; choose Starfish when you want a focused
realtime layer inside your own app."
