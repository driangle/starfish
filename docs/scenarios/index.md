# Project Scenarios

This section describes five example projects, each built on a different part of the
Starfish API. The goal is to show which primitive fits which problem. The projects
are illustrative but the code is valid against the TypeScript SDK.

| Project | Description | Starfish features |
|---------|-------------|-------------------|
| [Constellation](./constellation) | Public installation where each phone is a point of light | [Presence](../cookbook/presence), [clock sync](../guide/workflows#synchronized-timing), [broadcast](../cookbook/targeted-messaging) |
| [Duet](./duet) | Pairs two anonymous users for low-latency interaction | [Pools](../cookbook/pool-auto-pairing), [WebRTC](../cookbook/webrtc-data-channels), [unreliable delivery](../cookbook/reliable-vs-unreliable) |
| [The Long Mural](./the-long-mural) | Persistent shared drawing canvas | [Shared data ops](../cookbook/shared-state), [scopes](../guide/core-concepts#scopes), [optimistic concurrency](../guide/core-concepts#optimistic-concurrency) |
| [Chorus](./chorus) | Audience phones triggered as a synchronized sound system | [Clock-scheduled events](../guide/workflows#synchronized-timing), [broadcast](../cookbook/targeted-messaging), [`latest` delivery](../cookbook/reliable-vs-unreliable) |
| [Wander](./wander) | One-to-one message exchange between anonymous users | [Direct messaging](../cookbook/targeted-messaging), [request/reply](../cookbook/request-reply) |

Each example assumes a connected client, created and connected like this:

```ts
import { StarfishClient } from "@starfish/client";

const client = new StarfishClient({ server: "wss://stars.example.com" });
await client.connect();
```

The per-project pages pick up from there with the session join and the feature code.

## Choosing a primitive

- **[Presence](../cookbook/presence)** — current per-client state (position, status, assignment). Replaces on
  each update.
- **[Topics](../cookbook/pub-sub)** — many-to-many pub/sub within a named channel.
- **[Broadcast](../cookbook/targeted-messaging)** and the **[clock](../guide/workflows#synchronized-timing)** — coordinate an action across many clients at a
  shared server time.
- **[Shared data](../cookbook/shared-state)** — persistent state with structured operations (`list.add`,
  `counter.add`, `merge`, `replace`) and optional version checks.
- **[Pools](../cookbook/pool-auto-pairing)** — server-side matchmaking without a shared room name.
- **[WebRTC](../cookbook/webrtc-data-channels)** — low-latency peer-to-peer data path that bypasses the server.
- **[Direct messaging](../cookbook/targeted-messaging)** — messages addressed to specific clients.

See the [Quick Start](/guide/quick-start) to get running, and the [Cookbook](/cookbook/)
for the individual patterns used across these scenarios.
