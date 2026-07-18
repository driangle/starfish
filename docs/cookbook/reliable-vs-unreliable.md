# Send Reliable vs Unreliable Messages

## Problem

Some messages (chat, commands) must arrive. Others (cursor positions, sensor readings) are fine to drop if a newer value is coming. You need to choose the right delivery mode.

## Solution

Set `reliability` in `DeliveryOptions` to control how messages are delivered:

- **`"reliable"`** (default) — guaranteed delivery via WebSocket. Every message arrives in order.
- **`"unreliable"`** — fire-and-forget. Fast but may be dropped under congestion.
- **`"latest"`** — only the most recent value matters. Supersedes older in-flight messages.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session");

// Reliable: chat messages must arrive
client.publish("chat", { text: "Hello!" }, {
  delivery: { reliability: "reliable" },
});

// Unreliable: cursor updates are high-frequency and ephemeral
client.publish("cursors", { x: 120, y: 340 }, {
  delivery: { reliability: "unreliable" },
});

// Latest: only the most recent game state matters
client.publish("game.state", { score: 42, level: 3 }, {
  delivery: { reliability: "latest" },
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, HeaderOptions, DeliveryOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session")

# Reliable: chat messages must arrive
await client.publish("chat", {"text": "Hello!"}, HeaderOptions(
    delivery=DeliveryOptions(reliability="reliable"),
))

# Unreliable: cursor updates are high-frequency and ephemeral
await client.publish("cursors", {"x": 120, "y": 340}, HeaderOptions(
    delivery=DeliveryOptions(reliability="unreliable"),
))

# Latest: only the most recent game state matters
await client.publish("game.state", {"score": 42, "level": 3}, HeaderOptions(
    delivery=DeliveryOptions(reliability="latest"),
))
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session")

// Reliable: chat messages must arrive
try client.publish(topic: "chat", payload: AnyCodable(["text": "Hello!"]), options: HeaderOptions(
    delivery: DeliveryOptions(reliability: .reliable)
))

// Unreliable: cursor updates are high-frequency and ephemeral
try client.publish(topic: "cursors", payload: AnyCodable(["x": 120, "y": 340]), options: HeaderOptions(
    delivery: DeliveryOptions(reliability: .unreliable)
))

// Latest: only the most recent game state matters
try client.publish(topic: "game.state", payload: AnyCodable(["score": 42, "level": 3]), options: HeaderOptions(
    delivery: DeliveryOptions(reliability: .latest)
))
```

:::

## Explanation

| Mode | Guarantee | Ordering | Best for |
|------|-----------|----------|----------|
| `reliable` | Every message delivered | Ordered | Chat, commands, state changes |
| `unreliable` | May drop messages | Unordered | Cursor, sensor, audio levels |
| `latest` | Only newest value kept | N/A | Game state, slider values, status |

**`reliable`** uses the WebSocket transport, which provides TCP-level guarantees. Every message arrives in the order it was sent.

**`unreliable`** trades delivery guarantees for lower latency. If you're sending 60 cursor updates per second, losing a few is invisible to the user.

**`latest`** is ideal for values where only the current state matters. If three updates are in flight, only the last one is delivered. This prevents stale data from arriving after a newer update.

## Variations

### Combine with ordering control

::: code-group

```typescript [TypeScript]
client.publish("positions", { x: 10, y: 20 }, {
  delivery: {
    reliability: "unreliable",
    ordering: "unordered",   // don't wait for in-order delivery
  },
});
```

```python [Python]
await client.publish("positions", {"x": 10, "y": 20}, HeaderOptions(
    delivery=DeliveryOptions(
        reliability="unreliable",
        ordering="unordered",
    ),
))
```

```swift [Swift]
try client.publish(topic: "positions", payload: AnyCodable(["x": 10, "y": 20]), options: HeaderOptions(
    delivery: DeliveryOptions(
        reliability: .unreliable,
        ordering: .unordered
    )
))
```

:::

### Direct messages with reliability

The same delivery options work with `send` and `broadcast`:

::: code-group

```typescript [TypeScript]
client.send("client-abc", { action: "kick" }, {
  delivery: { reliability: "reliable" },
  priority: "high",
});
```

```python [Python]
await client.send("client-abc", {"action": "kick"}, HeaderOptions(
    delivery=DeliveryOptions(reliability="reliable"),
    priority="high",
))
```

```swift [Swift]
try client.send(to: "client-abc", payload: AnyCodable(["action": "kick"]), options: HeaderOptions(
    delivery: DeliveryOptions(reliability: .reliable),
    priority: .high
))
```

:::
