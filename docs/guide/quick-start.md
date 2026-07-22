# Quick Start

This guide walks you through a minimal working example: connect to a server, join a session, send a message, and receive it.

## Connect, Join, Publish, Subscribe

::: code-group

```ts [TypeScript (Browser)]
import { StarfishClient } from "@starfish/client";

// 1. Create a client
const client = new StarfishClient({
  server: "ws://localhost:4000",
});

// 2. Connect to the server
await client.connect();

// 3. Join a session
await client.join("my-room");

// 4. Listen for messages on a topic
client.topic$("chat").subscribe((frame) => {
  console.log(`${frame.header.from}: ${frame.payload.text}`);
});
await client.subscribe("chat");

// 5. Publish a message
client.publish("chat", { text: "Hello, Starfish!" });
```

```ts [TypeScript (Node.js)]
import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  ws: (url) => new WebSocket(url),
});

await client.connect();
await client.join("my-room");

client.topic$("chat").subscribe((frame) => {
  console.log(`${frame.header.from}: ${frame.payload.text}`);
});
await client.subscribe("chat");

client.publish("chat", { text: "Hello from Node!" });
```

```python [Python]
import asyncio
from starfish import StarfishClient, StarfishClientOptions

async def main():
    # 1. Create a client
    client = StarfishClient(StarfishClientOptions(
        server="ws://localhost:4000"
    ))

    # 2. Connect to the server
    await client.connect()

    # 3. Join a session
    await client.join("my-room")

    # 4. Listen for messages on a topic
    client.topic_stream("chat").subscribe(
        lambda frame: print(f"{frame.header.from_id}: {frame.payload['text']}")
    )
    await client.subscribe("chat")

    # 5. Publish a message
    await client.publish("chat", {"text": "Hello, Starfish!"})

asyncio.run(main())
```

```swift [Swift]
import StarfishClient

// 1. Create a client
let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))

// 2. Connect to the server
try await client.connect()

// 3. Join a session
try await client.join(session: "my-room")

// 4. Listen for messages on a topic
Task {
    for await frame in client.topicStream("chat") {
        if let text = frame.payloadString("text") {
            print("\(frame.header.from ?? "unknown"): \(text)")
        }
    }
}
try await client.subscribe(topic: "chat")

// 5. Publish a message
try client.publish(topic: "chat", payload: ["text": "Hello, Starfish!"])
```

:::

## What Just Happened?

1. **Create a client** with your server URL (and a WebSocket factory for Node.js).
2. **`connect()`** opens a WebSocket connection and performs a handshake. The server assigns your client a unique ID.
3. **`join()`** places your client into a named session. Other clients in the same session can see you and communicate with you.
4. **Set up a listener** for the `"chat"` topic, then **`subscribe()`** tells the server you want to receive messages published to that topic.
5. **`publish()`** sends a message to all subscribers of `"chat"` in your session.

## Next Steps

- Learn about [Core Concepts](./core-concepts) like sessions, topics, presence, and shared data
- Let strangers find each other with [Pool Matchmaking](./workflows#pool-matchmaking) before they join a session
- See all available options in [Configuration](./configuration)
- Explore [Common Workflows](./workflows) for real-world patterns
