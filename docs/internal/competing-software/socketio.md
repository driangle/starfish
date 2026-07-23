# Socket.IO

> General-purpose WebSocket eventing library with rooms and fallbacks.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Socket.IO is the classic, widely-used **realtime eventing library** for Node.js and the
browser (with clients in several languages). It gives you an event-based abstraction over
WebSocket — `socket.emit("event", data)` / `socket.on("event", ...)` — plus rooms,
namespaces, broadcasting, acknowledgements, and automatic reconnection with transport
fallback (long-polling ↔ WebSocket). It is a general-purpose building block, not tied to any
domain.

## How it works

- A Node.js server and clients exchange named **events** with arbitrary JSON (or binary)
  payloads.
- **Rooms** group sockets so you can broadcast to subsets; **namespaces** partition the
  connection.
- The **Engine.IO** layer underneath handles connection upgrades, heartbeats, reconnection,
  and long-polling fallback for hostile networks.
- Everything above raw eventing — presence, shared state, matchmaking — is **left to you** to
  build.

## At a glance

| Axis | Socket.IO |
|------|-----------|
| Category | Library (general-purpose eventing) |
| Transport | WebSocket (+ HTTP long-polling fallback) |
| Deployment | Self-hostable (you run the Node server) |
| Presence | DIY |
| Pub/Sub | Rooms + events (a general primitive, not topic pub/sub semantics) |
| Shared-state model | None — you build it |
| Matchmaking | No — DIY on top of rooms |
| Language & runtime | Server: Node.js. Clients: JS, plus Java, Swift, C++, Python, Go (community) |
| Licensing / cost | MIT — free, self-hosted |
| Creative-coding fit | Moderate — a fine substrate, but you build the domain layer |

## Overlap with Starfish

- Both provide **WebSocket messaging with rooms** and reconnection.
- Both are **self-hostable** and message-oriented.
- You *could* build much of Starfish's surface on top of Socket.IO — which is exactly the
  point of comparison.

## Where Starfish differs / wins

- **Domain-complete vs. bare substrate.** Socket.IO gives you events and rooms; you then
  hand-build presence, pub/sub semantics, shared/synced state, delivery guarantees, and
  matchmaking. Starfish ships all of those as a defined protocol.
- **WebRTC transport** for P2P/low-latency traffic; Socket.IO is WebSocket/HTTP only through
  the server.
- **Uniform cross-language protocol.** Socket.IO's non-JS clients vary in quality and lag the
  Node server; Starfish's SDKs implement one specified protocol across TS/Python/Go/Swift.
- **Creative-coding-shaped primitives** (presence, latest-value delivery, priorities) instead
  of raw events.

## Where it beats Starfish

- **Ubiquity and maturity.** Enormous community, endless examples, and it's a safe,
  well-understood default that most developers already know.
- **Maximum flexibility.** Being unopinionated, it fits *any* eventing use case, not just the
  creative-coding shape Starfish targets.
- **Battle-tested fallback** for terrible networks (long-polling) baked in for years.

## Verdict

Socket.IO wins when you want a **general, familiar, unopinionated eventing layer** and are
happy to build presence/state/matchmaking yourself — or your app isn't creative-coding-shaped
at all. Starfish wins when you want those higher-level primitives **already defined**, plus
WebRTC and a uniform multi-language protocol, without reinventing them on raw events.

## How we position against this

"Socket.IO is the go-to general-purpose WebSocket eventing library — rooms, events,
reconnection — and you build everything domain-specific on top. Starfish is opinionated for
realtime creative coding: presence, pub/sub, shared state, matchmaking, and WebRTC are the
protocol, not homework. If you want a blank, familiar substrate, Socket.IO; if you want the
creative-multiplayer batteries included, Starfish."
