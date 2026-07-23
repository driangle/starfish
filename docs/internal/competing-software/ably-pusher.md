# Ably / Pusher

> Hosted pub/sub + presence channels as a managed service.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What they are

**Pusher** (Channels) and **Ably** are **hosted realtime messaging services**. You publish
to named **channels** and subscribers receive messages; both offer **presence channels** that
track who's subscribed and their state. They handle the servers, scaling, and global edge for
you — you consume an API/SDK and pay by usage.

- **Pusher Channels** — the original simple, developer-friendly hosted pub/sub with presence.
- **Ably** — a more feature-rich platform: guaranteed ordering, message history/rewind,
  exactly-once semantics, connection recovery, and strong SLAs.

## How they work

- Clients open a WebSocket to the provider's edge and **subscribe** to channels.
- **Publish** sends a message to everyone subscribed to that channel (often via a server-side
  key or token auth).
- **Presence channels** maintain a membership set with per-member state and emit
  enter/leave/update events.
- Ably adds durability features: **message history**, **rewind/resume** after disconnect, and
  configurable delivery guarantees.

## At a glance

| Axis | Ably / Pusher |
|------|---------------|
| Category | Hosted service (managed pub/sub) |
| Transport | WebSocket (Ably also MQTT/SSE/etc.) |
| Deployment | Hosted-only (SaaS) |
| Presence | Yes — presence channels |
| Pub/Sub | Yes — the core feature |
| Shared-state model | None — messaging only (Ably has history, not shared state) |
| Matchmaking | No |
| Language & runtime | Many client + server SDKs (JS, Python, Go, Ruby, PHP, mobile, …) |
| Licensing / cost | Proprietary SaaS; free tier + usage-based paid plans |
| Creative-coding fit | Moderate — reliable channels, but hosted-only and no P2P/state |

## Overlap with Starfish

- **Pub/sub channels** and **presence** are core to both — the most direct feature overlap.
- Both give you **reliable message fan-out** to many subscribers.
- Both have broad multi-language client coverage.

## Where Starfish differs / wins

- **Self-hostable, no per-message cost.** Ably/Pusher are hosted-only and priced by
  messages/connections; Starfish you run yourself with no metered billing or vendor lock-in.
- **Shared/synced state and matchmaking.** Starfish has structured shared data and pools;
  Ably/Pusher are messaging services with no shared-state or matchmaking primitive.
- **WebRTC peer-to-peer.** For low-latency creative traffic Starfish can bypass the server;
  these services always relay through their cloud.
- **Creative-coding-shaped delivery** (unreliable/latest, priorities) tuned for high-frequency
  sketch traffic.

## Where it beats Starfish

- **Zero-ops global reliability.** Managed edge, autoscaling, SLAs, and (Ably) guaranteed
  ordering, exactly-once, and message history/rewind — production-grade reliability with
  nothing to operate.
- **Maturity and support.** Enterprise features, dashboards, compliance, and paid support.
- **Durability.** Ably's persisted history and connection recovery exceed Starfish's ephemeral
  model for use cases needing message replay.

## Verdict

Ably/Pusher win when you want **rock-solid, zero-ops hosted pub/sub with presence** — reliable
channels, global scale, message history, SLAs — and don't need matchmaking, shared state, P2P,
or self-hosting. Starfish wins when you want a **self-hosted, WebRTC-capable protocol** that
also brings shared state and matchmaking, without per-message billing.

## How we position against this

"Ably and Pusher are excellent hosted pub/sub-with-presence services — reliable, global,
zero-ops, but SaaS-only, metered, and messaging-only (no shared state, matchmaking, or P2P).
Starfish covers pub/sub and presence too, but adds shared state, matchmaking, and optional
WebRTC, and you self-host it with no per-message bill. Choose Ably/Pusher for managed,
durable channels at scale; choose Starfish when you want to own the stack and need more than
messaging."
