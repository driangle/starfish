# Colyseus

> Authoritative multiplayer game-server framework for Node.js (rooms + state sync).
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Colyseus is an open-source, authoritative multiplayer **framework** for Node.js. You write
`Room` classes on the server that own the game state; clients connect, send messages, and
receive automatic state patches. It is one of the most popular choices for browser-based
`.io` games and small-to-mid multiplayer titles.

## How it works

- Each **Room** instance runs on the server and holds a schema-defined state object
  (`@colyseus/schema`). The server is the single source of truth.
- The framework computes **binary state diffs** and pushes them to clients over WebSocket
  every patch interval; clients get a synchronized mirror of the room state.
- Clients send **messages** to the room; the server mutates state in response. Nothing on
  the client is trusted.
- Built-in **matchmaking** (`join`, `joinOrCreate`, `filterBy`, reserved seats, lobby
  rooms) pairs players into rooms.
- Presence is handled via a `Presence` abstraction (local or Redis) used mostly for
  scaling across processes, not as a first-class per-client presence API.

## At a glance

| Axis | Colyseus |
|------|----------|
| Category | Framework (server-authoritative) |
| Transport | WebSocket (binary) |
| Deployment | Self-hostable (OSS) + Colyseus Cloud hosted option |
| Presence | Partial — Presence API is for scaling, not a rich per-client presence model |
| Pub/Sub | Via room messages + schema sync (not general topic pub/sub) |
| Shared-state model | **Server-authoritative** state sync (schema diffs) |
| Matchmaking | Yes — mature, filter-based |
| Language & runtime | Server: Node.js only. Clients: JS/TS, C#/Unity, Haxe, Lua/Defold, C++ |
| Licensing / cost | MIT (framework); Colyseus Cloud is paid hosting |
| Creative-coding fit | Moderate — great for games, heavier than needed for sketches |

## Overlap with Starfish

- Both give you **rooms/sessions** and real-time messaging over WebSocket.
- Both offer **matchmaking** to pair clients into a room.
- Both synchronize **shared state** across a room's members.

## Where Starfish differs / wins

- **Not opinionated about authority.** Colyseus assumes a server owns the truth and clients
  are dumb mirrors. Starfish is a peer protocol: clients publish, present, and write shared
  data directly. For collaborative art, jam sessions, and installations there's often no
  "authoritative game loop" to model.
- **Transport neutrality + WebRTC.** Starfish can move high-frequency, latency-sensitive
  traffic (cursors, audio params) over WebRTC data channels peer-to-peer; Colyseus is
  WebSocket-only through the server.
- **Multi-language SDKs including a self-hostable non-Node server.** Colyseus servers are
  Node-only; Starfish has Go and Python servers too.
- **Lighter mental model.** Presence and pub/sub are first-class, not something you rebuild
  on top of room messages.

## Where it beats Starfish

- **Anti-cheat / authority.** If you need a trusted server that validates every move (any
  competitive game), Colyseus's server-authoritative model is the right shape and Starfish
  is not — Starfish deliberately trusts clients.
- **Automatic binary state diffing.** `@colyseus/schema` gives efficient, typed,
  incremental state sync out of the box; Starfish's structured-ops model is coarser.
- **Game-oriented tooling and ecosystem.** Monitoring panel, load testing, Unity/Defold
  clients, and a large game-dev community.

## Verdict

Colyseus is the better tool when you're building an actual **game** with server-authoritative
rules, anti-cheat, and a fixed simulation loop. Starfish is the better tool for
**creative-coding collaboration** — sketches, performances, installations — where clients are
trusted peers, latency matters more than authority, and you want WebRTC and non-JS runtimes.

## How we position against this

"Colyseus is an authoritative *game-server* framework — you write server-side room logic and
clients mirror it. Starfish is a *protocol* for trusted creative-coding peers: presence,
pub/sub, and shared state are built in, it runs over WebRTC as well as WebSocket, and it
isn't tied to Node. Reach for Colyseus when you need a referee; reach for Starfish when you
need a shared canvas."
