# Core Concepts

## Sessions

A **session** is a named room that groups clients together. All communication — topics, presence, data, and direct messaging — happens within a session. A client must join a session before using any of these features.

::: code-group

```ts [TypeScript]
// Join a session (creates it if it doesn't exist)
await client.join("my-session");

// Join with identity metadata
await client.join("my-session", {
  name: "Alice",
  role: "performer",
  meta: { instrument: "piano" },
});

// Track who's in the session
client.clients$.subscribe((clients) => {
  console.log("All clients:", clients);
});

// Track peers (everyone except yourself)
client.peers$.subscribe((peers) => {
  console.log("Peers:", peers);
});

// Leave the session
await client.leave();
```

```python [Python]
from starfish import JoinOptions

# Join a session (creates it if it doesn't exist)
await client.join("my-session")

# Join with identity metadata
await client.join("my-session", JoinOptions(
    name="Alice",
    role="performer",
    meta={"instrument": "piano"},
))

# Track who's in the session
client.clients.subscribe(lambda clients: print("All clients:", clients))

# Track peers (everyone except yourself)
client.peers.subscribe(lambda peers: print("Peers:", peers))

# Leave the session
await client.leave()
```

```swift [Swift]
// Join a session (creates it if it doesn't exist)
try await client.join(session: "my-session")

// Join with identity metadata
try await client.join(session: "my-session", options: JoinOptions(
    name: "Alice",
    role: "performer",
    meta: ["instrument": "piano"]
))

// Track who's in the session
Task {
    for await clients in client.clients {
        print("All clients:", clients)
    }
}

// Track peers (everyone except yourself)
Task {
    for await peers in client.peers {
        print("Peers:", peers)
    }
}

// Leave the session
try client.leave()
```

:::

Each client in a session has a `ClientInfo` containing their `id`, optional `name`, `role`, and `meta`.

## Topics

**Topics** are named pub/sub channels within a session. Subscribe to a topic to receive messages, and publish to send messages to all subscribers.

::: code-group

```ts [TypeScript]
// Subscribe to a topic
await client.subscribe("cursor");

// Listen for messages
client.topic$("cursor").subscribe((frame) => {
  console.log(frame.header.from, frame.payload);
});

// Publish to a topic
client.publish("cursor", { x: 100, y: 200 });

// Unsubscribe
await client.unsubscribe("cursor");
```

```python [Python]
# Subscribe to a topic
await client.subscribe("cursor")

# Listen for messages
client.topic_stream("cursor").subscribe(
    lambda frame: print(frame.header.from_id, frame.payload)
)

# Publish to a topic
await client.publish("cursor", {"x": 100, "y": 200})

# Unsubscribe
await client.unsubscribe("cursor")
```

```swift [Swift]
// Subscribe to a topic
try await client.subscribe(topic: "cursor")

// Listen for messages
Task {
    for await frame in client.topicStream("cursor") {
        print(frame.header.from, frame.payload)
    }
}

// Publish to a topic
try client.publish(topic: "cursor", payload: ["x": 100, "y": 200])

// Unsubscribe
try client.unsubscribe(topic: "cursor")
```

:::

You can also pass a callback directly to `subscribe` as a shorthand:

::: code-group

```ts [TypeScript]
await client.subscribe("cursor", (frame) => {
  console.log(frame.payload);
});
```

```python [Python]
await client.subscribe("cursor", lambda frame: print(frame.payload))
```

```swift [Swift]
try await client.subscribe(topic: "cursor") { frame in
    print(frame.payload)
}
```

:::

## Presence

**Presence** lets each client share ephemeral state — like cursor position, status, or tool selection — with all other clients in the session. Unlike topics, presence represents "current state" rather than a stream of events. Setting presence replaces your previous value.

::: code-group

```ts [TypeScript]
// Set your presence
client.presence.set({ cursor: { x: 50, y: 75 }, tool: "brush" });

// Observe all presence data (Map of clientId → presence)
client.presence$.subscribe((presenceMap) => {
  for (const [clientId, data] of presenceMap) {
    console.log(clientId, data);
  }
});
```

```python [Python]
# Set your presence
client.presence_set({"cursor": {"x": 50, "y": 75}, "tool": "brush"})

# Observe all presence data (dict of clientId → presence)
client.presence.subscribe(
    lambda presence: [print(k, v) for k, v in presence.items()]
)
```

```swift [Swift]
// Set your presence
try client.presence.set(["cursor": ["x": 50, "y": 75], "tool": "brush"])

// Observe all presence data
Task {
    for await presenceMap in client.presenceStream {
        for (clientId, data) in presenceMap {
            print(clientId, data)
        }
    }
}
```

:::

Presence data is limited to 8 KB per client.

## Data Operations

**Shared data** provides persistent key-value storage within a session. Unlike presence, data persists for the lifetime of the session and supports structured operations for conflict-free updates.

::: code-group

```ts [TypeScript]
// Save data
await client.save({
  key: "score",
  scope: "session",
  op: "replace",
  data: { points: 42 },
});

// Read data
const result = await client.get({ key: "score", scope: "session" });
console.log(result.data, result.version);

// Listen for changes to a specific key
client.key$("score").subscribe((result) => {
  console.log("Score updated:", result.data);
});

// Listen for all data changes
client.changed$.subscribe((result) => {
  console.log(result.key, result.data);
});
```

```python [Python]
from starfish import SaveOptions

# Save data
await client.save(SaveOptions(
    key="score",
    scope="session",
    op="replace",
    data={"points": 42},
))

# Read data
result = await client.get("score", scope="session")
print(result.data, result.version)

# Listen for changes to a specific key
client.data_key_stream("score").subscribe(
    lambda result: print("Score updated:", result.data)
)

# Listen for all data changes
client.data_changed.subscribe(
    lambda result: print(result.key, result.data)
)
```

```swift [Swift]
// Save data
let result = try await client.save(SaveOptions(
    key: "score",
    scope: .session,
    op: .replace,
    data: ["points": 42]
))

// Read data
let current = try await client.get(key: "score", scope: .session)
print(current.data, current.version)

// Listen for changes to a specific key
Task {
    for await result in client.keyStream("score") {
        print("Score updated:", result.data)
    }
}

// Listen for all data changes
Task {
    for await result in client.dataChanges {
        print(result.key, result.data)
    }
}
```

:::

### Data Operations

The `op` field determines how the data is applied:

| Operation | Description |
|-----------|-------------|
| `replace` | Replace the entire value |
| `merge` | Shallow-merge an object into the existing value |
| `set.add` | Add elements to a set |
| `set.remove` | Remove elements from a set |
| `list.add` | Append elements to a list |
| `list.remove` | Remove elements from a list |
| `counter.add` | Increment a numeric counter |
| `delete` | Delete the key |

### Scopes

- **`session`** — shared across all clients in the session
- **`self`** — private to the current client (visible only to you)

### Optimistic Concurrency

Use `expectedVersion` to prevent conflicting writes:

::: code-group

```ts [TypeScript]
const current = await client.get({ key: "score", scope: "session" });

await client.save({
  key: "score",
  scope: "session",
  op: "replace",
  data: { points: current.data.points + 1 },
  expectedVersion: current.version,
});
```

```python [Python]
current = await client.get("score", scope="session")

await client.save(SaveOptions(
    key="score",
    scope="session",
    op="replace",
    data={"points": current.data["points"] + 1},
    expected_version=current.version,
))
```

```swift [Swift]
let current = try await client.get(key: "score", scope: .session)

try await client.save(SaveOptions(
    key: "score",
    scope: .session,
    op: .replace,
    data: ["points": (current.data?.intValue ?? 0) + 1],
    expectedVersion: current.version
))
```

:::

If another client has modified the data since you read it, the save will fail, allowing you to re-read and retry.

## Frames

A **frame** is the fundamental message unit in the Starfish protocol. Every message sent between clients and the server is a frame. Frames use an envelope structure with two top-level fields:

**`header`** — routing and protocol metadata:

| Field | Type | Description |
|-------|------|-------------|
| `v` | `number` | Protocol version (`2`), optional after handshake |
| `id` | `string` | Unique frame identifier |
| `resource` | `string` | Target resource (e.g. `topic`, `session`, `data`) |
| `method` | `string` | Operation (e.g. `publish`, `join`, `save`) |
| `kind` | `string` | Message role: `"request"`, `"response"`, or `"event"` |
| `ts` | `number` | Timestamp (optional) |
| `session` | `string` | Session name (optional) |
| `from` | `string` | Sender's client ID (optional) |
| `to` | `string \| string[]` | Recipient(s) (optional) |
| `topic` | `string` | Topic name (optional) |
| `replyTo` | `string` | ID of the request this responds to (optional) |
| `delivery` | `DeliveryOptions` | Delivery configuration (optional) |
| `priority` | `string` | `"low"`, `"normal"`, `"high"`, or `"critical"` (optional) |
| `ttl` | `number` | Time-to-live in ms (optional) |
| `meta` | `Record<string, unknown>` | Application-specific metadata (optional) |

**`payload`** — the application data (optional).

### Kind Semantics

The `kind` field describes the role of each frame:

| Kind | Description | Examples |
|------|-------------|----------|
| `request` | A method invocation that expects a response | `join`, `subscribe`, `save`, `get` |
| `response` | A reply to a request (matched via `replyTo`) | Join confirmation, get result |
| `event` | An unsolicited notification — fire-and-forget | `publish`, `presence.set`, `data.changed` |

### `header.meta` Extensibility

The `meta` field allows applications to attach custom metadata to any frame without conflicting with protocol fields:

```ts
client.publish("updates", { text: "hello" }, {
  meta: { batchId: "batch_42", priority_level: 5 },
});
```

You can listen for all frames using the low-level event API:

::: code-group

```ts [TypeScript]
// All frames
client.on((frame) => {
  console.log(frame.header.resource, frame.header.method, frame.payload);
});

// Filtered frames
client.events$({ resource: "topic", method: "message", topic: "cursor" }).subscribe((frame) => {
  console.log(frame.payload);
});
```

```python [Python]
# All frames
client.on(lambda frame: print(frame.header.resource, frame.header.method, frame.payload))

# Filtered frames
client.events(EventFilter(resource="topic", method="message", topic="cursor")).subscribe(
    lambda frame: print(frame.payload)
)
```

```swift [Swift]
// All frames
client.on { frame in
    print(frame.header.resource, frame.header.method, frame.payload as Any)
}

// Filtered frames
Task {
    for await frame in client.events(filter: EventFilter(resource: "topic", method: "message", topic: "cursor")) {
        print(frame.payload as Any)
    }
}
```

:::

## Delivery Options

When publishing or sending messages, you can control how they are delivered using `HeaderOptions`:

```ts
client.publish("sensor-data", { value: 42 }, {
  delivery: {
    reliability: "unreliable", // "reliable" | "unreliable" | "latest"
    ordering: "unordered",     // "ordered" | "unordered"
    preferTransport: "auto",   // "ws" | "rtc" | "auto"
    fallback: true,            // fall back to WS if RTC unavailable
    includeSelf: false,        // receive your own messages
  },
  priority: "normal",          // "low" | "normal" | "high" | "critical"
  ttl: 5000,                   // time-to-live in ms
  meta: {},                    // application-specific metadata
});
```

| Reliability | Behavior |
|-------------|----------|
| `reliable` | Guaranteed delivery via WebSocket (default) |
| `unreliable` | Best-effort, may be dropped — ideal for high-frequency updates like cursor positions |
| `latest` | Only the most recent value matters — intermediate messages may be skipped |

See [Best Practices](./best-practices) for guidance on choosing delivery options.

## Connection Lifecycle

The client connection goes through four states:

```
disconnected → connecting → connected → reconnecting → connected
                                ↓                           ↓
                          disconnected                disconnected
```

| State | Description |
|-------|-------------|
| `disconnected` | Not connected to the server |
| `connecting` | WebSocket connection in progress |
| `connected` | Connected and ready to send/receive |
| `reconnecting` | Connection lost, attempting to reconnect |

::: code-group

```ts [TypeScript]
client.connection$.subscribe((state) => {
  console.log("Connection state:", state);
});
```

```python [Python]
client.connection_state.subscribe(
    lambda state: print("Connection state:", state)
)
```

```swift [Swift]
Task {
    for await state in client.connectionState {
        print("Connection state:", state)
    }
}
```

:::

The client automatically reconnects with exponential backoff when the connection drops. See [Configuration](./configuration) for reconnection options.
