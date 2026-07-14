# Publish/Subscribe to a Topic

## Problem

You want multiple clients to communicate through named channels (topics) without knowing each other's client IDs.

## Solution

Subscribe to a topic, then publish messages to it. All subscribers receive the message.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session");

// Subscribe with a callback
await client.subscribe("chat", (frame) => {
  console.log(`${frame.from}: ${frame.payload}`);
});

// Or use the topic stream for reactive patterns
client.topic$("chat").subscribe((frame) => {
  console.log(`${frame.from}: ${frame.payload}`);
});

// Publish a message to all subscribers
client.publish("chat", { text: "Hello, everyone!" });
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session")

# Subscribe with a callback
await client.subscribe("chat", lambda frame: print(f"{frame.from_}: {frame.payload}"))

# Or use the topic stream for reactive patterns
client.topic_stream("chat").subscribe(
    lambda frame: print(f"{frame.from_}: {frame.payload}")
)

# Publish a message to all subscribers
await client.publish("chat", {"text": "Hello, everyone!"})
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session")

// Subscribe with a callback
try await client.subscribe(topic: "chat") { frame in
    print("\(frame.from ?? "?"): \(frame.payload ?? AnyCodable(""))")
}

// Or use the topic stream with async iteration
Task {
    for await frame in client.topicStream("chat") {
        print("\(frame.from ?? "?"): \(frame.payload ?? AnyCodable(""))")
    }
}

// Publish a message to all subscribers
try client.publish(topic: "chat", payload: AnyCodable(["text": "Hello, everyone!"]))
```

:::

## Explanation

- **`subscribe(topic, callback?)`** — registers interest in a topic. The optional callback fires for each incoming message. Returns a confirmation frame.
- **`topic$(topic)` / `topic_stream(topic)` / `topicStream(topic)`** — returns an event stream scoped to a single topic. Useful when you want to compose or filter events.
- **`publish(topic, payload, options?)`** — sends a message to all clients subscribed to the topic. The sender does not receive their own message by default.
- **`unsubscribe(topic)`** — stops receiving messages for that topic.

Topic names can be any string up to 128 characters. Use a dot-separated convention (e.g., `game.events`, `sensor.temperature`) to organize your topics.

## Variations

### Unsubscribe from a topic

::: code-group

```typescript [TypeScript]
await client.unsubscribe("chat");
```

```python [Python]
await client.unsubscribe("chat")
```

```swift [Swift]
try client.unsubscribe(topic: "chat")
```

:::

### Publish with delivery options

::: code-group

```typescript [TypeScript]
client.publish("sensor.data", { temp: 22.5 }, {
  delivery: { reliability: "unreliable" },
  ttl: 5000,
});
```

```python [Python]
from starfish import FrameOptions, DeliveryOptions

await client.publish("sensor.data", {"temp": 22.5}, FrameOptions(
    delivery=DeliveryOptions(reliability="unreliable"),
    ttl=5000,
))
```

```swift [Swift]
try client.publish(
    topic: "sensor.data",
    payload: AnyCodable(["temp": 22.5]),
    options: FrameOptions(
        delivery: DeliveryOptions(reliability: .unreliable),
        ttl: 5000
    )
)
```

:::
