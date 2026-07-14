# Request/Reply Pattern

## Problem

You need RPC-style communication — send a request to a specific client and wait for its response. For example, asking a "host" client for the current game configuration.

## Solution

Use the `replyTo` field in a message to tell the recipient where to send their response. The requester listens on a unique topic for the reply.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

// --- Requester ---
const requester = new StarfishClient({ server: "ws://localhost:4000" });
await requester.connect();
await requester.join("my-session");

// Create a unique reply topic
const replyTopic = `reply.${requester.clientId}.${Date.now()}`;

// Listen for the response
const response = new Promise((resolve) => {
  requester.subscribe(replyTopic, (frame) => {
    resolve(frame.payload);
    requester.unsubscribe(replyTopic);
  });
});

// Send the request
requester.publish("rpc.get-config", {
  replyTo: replyTopic,
  query: "game-settings",
});

const config = await response;
console.log("Got config:", config);

// --- Responder ---
const responder = new StarfishClient({ server: "ws://localhost:4000" });
await responder.connect();
await responder.join("my-session");

await responder.subscribe("rpc.get-config", (frame) => {
  const { replyTo, query } = frame.payload;

  // Send the response back on the reply topic
  responder.publish(replyTo, {
    maxPlayers: 8,
    mapSize: "large",
  });
});
```

```python [Python]
import asyncio
from starfish import StarfishClient, StarfishClientOptions

# --- Requester ---
requester = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await requester.connect()
await requester.join("my-session")

# Create a unique reply topic
reply_topic = f"reply.{requester.client_id}.{asyncio.get_event_loop().time()}"

# Listen for the response
future = asyncio.get_event_loop().create_future()

async def on_reply(frame):
    future.set_result(frame.payload)
    await requester.unsubscribe(reply_topic)

await requester.subscribe(reply_topic, on_reply)

# Send the request
await requester.publish("rpc.get-config", {
    "replyTo": reply_topic,
    "query": "game-settings",
})

config = await future
print("Got config:", config)

# --- Responder ---
responder = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await responder.connect()
await responder.join("my-session")

async def handle_request(frame):
    reply_to = frame.payload["replyTo"]
    # Send the response back on the reply topic
    await responder.publish(reply_to, {
        "maxPlayers": 8,
        "mapSize": "large",
    })

await responder.subscribe("rpc.get-config", handle_request)
```

```swift [Swift]
import StarfishClient
import Foundation

// --- Requester ---
let requester = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await requester.connect()
try await requester.join(session: "my-session")

// Create a unique reply topic
let replyTopic = "reply.\(requester.clientId ?? "").\(Int(Date().timeIntervalSince1970 * 1000))"

// Listen for the response using an async stream
try await requester.subscribe(topic: replyTopic)

// Send the request
try requester.publish(topic: "rpc.get-config", payload: AnyCodable([
    "replyTo": replyTopic,
    "query": "game-settings",
]))

// Wait for the response
for await frame in requester.topicStream(replyTopic) {
    print("Got config:", frame.payload as Any)
    try requester.unsubscribe(topic: replyTopic)
    break
}

// --- Responder ---
let responder = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await responder.connect()
try await responder.join(session: "my-session")

try await responder.subscribe(topic: "rpc.get-config") { frame in
    guard let payload = frame.payload?.value as? [String: Any],
          let replyTo = payload["replyTo"] as? String else { return }

    try? responder.publish(topic: replyTo, payload: AnyCodable([
        "maxPlayers": 8,
        "mapSize": "large",
    ]))
}
```

:::

## Explanation

Starfish doesn't have a built-in RPC mechanism, but the request/reply pattern is straightforward to implement:

1. **Requester** creates a unique reply topic (using client ID + timestamp to avoid collisions)
2. **Requester** subscribes to the reply topic and sends the request with a `replyTo` field
3. **Responder** handles the request and publishes the response to the `replyTo` topic
4. **Requester** receives the response and unsubscribes from the reply topic

This pattern works because topic subscriptions are lightweight and topic names are arbitrary strings.

## Variations

### Request with timeout

::: code-group

```typescript [TypeScript]
function requestWithTimeout(client, topic, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const replyTopic = `reply.${client.clientId}.${Date.now()}`;
    const timer = setTimeout(() => {
      client.unsubscribe(replyTopic);
      reject(new Error("Request timed out"));
    }, timeoutMs);

    client.subscribe(replyTopic, (frame) => {
      clearTimeout(timer);
      client.unsubscribe(replyTopic);
      resolve(frame.payload);
    });

    client.publish(topic, { ...payload, replyTo: replyTopic });
  });
}

const result = await requestWithTimeout(client, "rpc.ping", {});
```

```python [Python]
async def request_with_timeout(client, topic, payload, timeout=5.0):
    reply_topic = f"reply.{client.client_id}.{asyncio.get_event_loop().time()}"
    future = asyncio.get_event_loop().create_future()

    async def on_reply(frame):
        if not future.done():
            future.set_result(frame.payload)
        await client.unsubscribe(reply_topic)

    await client.subscribe(reply_topic, on_reply)
    await client.publish(topic, {**payload, "replyTo": reply_topic})

    return await asyncio.wait_for(future, timeout=timeout)

result = await request_with_timeout(client, "rpc.ping", {})
```

```swift [Swift]
func requestWithTimeout(
    client: StarfishClient,
    topic: String,
    payload: [String: Any],
    timeout: TimeInterval = 5.0
) async throws -> AnyCodable? {
    let replyTopic = "reply.\(client.clientId ?? "").\(Int(Date().timeIntervalSince1970 * 1000))"
    try await client.subscribe(topic: replyTopic)

    var merged = payload
    merged["replyTo"] = replyTopic
    try client.publish(topic: topic, payload: AnyCodable(merged))

    return try await withThrowingTaskGroup(of: AnyCodable?.self) { group in
        group.addTask {
            for await frame in client.topicStream(replyTopic) {
                try client.unsubscribe(topic: replyTopic)
                return frame.payload
            }
            return nil
        }
        group.addTask {
            try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
            try client.unsubscribe(topic: replyTopic)
            throw CancellationError()
        }
        let result = try await group.next()!
        group.cancelAll()
        return result
    }
}
```

:::
