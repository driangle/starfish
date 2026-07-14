# Broadcast to Specific Clients

## Problem

You want to send a message to one or more specific clients rather than broadcasting to the entire session or using topic-based pub/sub.

## Solution

Use `send()` to target specific client IDs, or `broadcast()` to send to everyone. Combine with the client list to build dynamic recipient groups.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session", { name: "Host", role: "host" });

// Send to a single client
client.send("client-abc", { action: "you-are-it" });

// Send to multiple clients
client.send(["client-abc", "client-def"], { action: "start-round" });

// Broadcast to everyone (excluding self by default)
client.broadcast({ action: "game-over", winner: "client-abc" });

// Broadcast including self
client.broadcast({ action: "reset" }, {
  delivery: { includeSelf: true },
});

// Target clients by role using the client list
client.clients$.subscribe((clients) => {
  const editors = clients
    .filter((c) => c.role === "editor")
    .map((c) => c.id);

  if (editors.length > 0) {
    client.send(editors, { notification: "New version available" });
  }
});
```

```python [Python]
from starfish import (
    StarfishClient, StarfishClientOptions, JoinOptions,
    FrameOptions, DeliveryOptions,
)

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session", JoinOptions(name="Host", role="host"))

# Send to a single client
await client.send("client-abc", {"action": "you-are-it"})

# Send to multiple clients
await client.send(["client-abc", "client-def"], {"action": "start-round"})

# Broadcast to everyone (excluding self by default)
await client.broadcast({"action": "game-over", "winner": "client-abc"})

# Broadcast including self
await client.broadcast(
    {"action": "reset"},
    include_self=True,
)

# Target clients by role using the client list
def on_clients(clients):
    editors = [c.id for c in clients if c.role == "editor"]
    if editors:
        # fire-and-forget in sync callback
        import asyncio
        asyncio.ensure_future(
            client.send(editors, {"notification": "New version available"})
        )

client.clients.subscribe(on_clients)
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session", options: JoinOptions(
    name: "Host", role: "host"
))

// Send to a single client
try client.send(to: "client-abc", payload: AnyCodable(["action": "you-are-it"]))

// Send to multiple clients
try client.send(to: .multiple(["client-abc", "client-def"]),
                payload: AnyCodable(["action": "start-round"]))

// Broadcast to everyone (excluding self by default)
try client.broadcast(payload: AnyCodable(["action": "game-over", "winner": "client-abc"]))

// Broadcast including self
try client.broadcast(payload: AnyCodable(["action": "reset"]), options: FrameOptions(
    delivery: DeliveryOptions(includeSelf: true)
))

// Target clients by role using the client list
Task {
    for await clients in client.clients {
        let editors = clients.filter { $0.role == "editor" }.map { $0.id }
        if !editors.isEmpty {
            try? client.send(
                to: .multiple(editors),
                payload: AnyCodable(["notification": "New version available"])
            )
        }
    }
}
```

:::

## Explanation

- **`send(to, payload, options?)`** — sends a direct message to one or more clients by ID. Only the specified recipients receive the message.
- **`broadcast(payload, options?)`** — sends to all clients in the session. By default excludes the sender; use `includeSelf: true` to include yourself.
- **`clients$` / `clients`** — the live list of connected clients, which you can filter by `role`, `name`, or `meta` to build dynamic recipient groups.

Direct messages and broadcasts support the same `FrameOptions` as topic messages — you can set reliability, priority, and TTL.

## Variations

### Send with high priority

::: code-group

```typescript [TypeScript]
client.send("client-abc", { alert: "Server shutting down" }, {
  priority: "critical",
  delivery: { reliability: "reliable" },
});
```

```python [Python]
await client.send("client-abc", {"alert": "Server shutting down"}, FrameOptions(
    priority="critical",
    delivery=DeliveryOptions(reliability="reliable"),
))
```

```swift [Swift]
try client.send(to: "client-abc", payload: AnyCodable(["alert": "Server shutting down"]), options: FrameOptions(
    delivery: DeliveryOptions(reliability: .reliable),
    priority: .critical
))
```

:::
