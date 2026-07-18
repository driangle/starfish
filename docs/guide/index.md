# Introduction

Starfish is a transport-neutral realtime protocol designed for creative coding. It provides the building blocks for networked performance, multiplayer sketches, installations, live visuals, and distributed browser-based artworks.

## Why Starfish?

Creative coding projects often need realtime communication between multiple participants — cursor sharing, synchronized visuals, collaborative drawing, live audio routing. Starfish gives you a simple, consistent API for all of these patterns without locking you into a specific language, runtime, or transport.

- **Sessions** group participants together
- **Topics** provide pub/sub messaging channels
- **Presence** shares live state (cursor positions, tool selections, status)
- **Shared data** persists key-value state across the session with conflict-free operations
- **WebRTC** enables low-latency peer-to-peer communication when you need it

## SDK Support

Starfish provides client SDKs for multiple languages with consistent APIs:

| SDK | Package | Status |
|-----|---------|--------|
| TypeScript | `@starfish/client` | Available |
| Python | `starfish` | Available |
| Swift | `StarfishClient` | Available |

## How It Works

A Starfish application connects to a server over WebSocket, joins a session, and communicates with other clients through topics, direct messages, or shared data. The SDK handles connection management, reconnection, clock synchronization, and transport selection automatically.

::: code-group

```ts [TypeScript]
import { StarfishClient } from "@starfish/client";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session");

client.publish("cursor", { x: 100, y: 200 });

client.topic$("cursor").subscribe((frame) => {
  console.log(frame.header.from, frame.payload);
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session")

await client.publish("cursor", {"x": 100, "y": 200})

client.topic_stream("cursor").subscribe(
    lambda frame: print(frame.header.from_id, frame.payload)
)
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session")

try client.publish(topic: "cursor", payload: ["x": 100, "y": 200])

for await frame in client.topicStream("cursor") {
    print(frame.header.from, frame.payload)
}
```

:::

## Guide Overview

| Page | What you'll learn |
|------|-------------------|
| [Installation](./installation) | Install the SDK and set up your environment |
| [Quick Start](./quick-start) | Build a minimal working example |
| [Core Concepts](./core-concepts) | Sessions, topics, presence, data, frames, and delivery |
| [Configuration](./configuration) | All client options and how to tune them |
| [API Overview](./api-overview) | Every method, observable, and type at a glance |
| [Architecture](./architecture) | How connections, frames, transports, and reconnection work |
| [Common Workflows](./workflows) | Patterns for messaging, presence, shared data, and more |
| [Best Practices](./best-practices) | Error handling, delivery tradeoffs, and resource cleanup |
| [Troubleshooting](./troubleshooting) | Common errors and how to fix them |
