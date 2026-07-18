# Filter Events by Type or Topic

## Problem

You're receiving many events and want to handle only specific ones — messages from a particular client, events on a certain topic, or frames matching a specific resource and method.

## Solution

Use `EventFilter` with the `events()` method to selectively subscribe to events matching your criteria.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session");

// Filter by topic
client.events$({ topic: "chat" }).subscribe((frame) => {
  console.log("Chat event:", frame.payload);
});

// Filter by sender
client.events$({ from: "client-abc" }).subscribe((frame) => {
  console.log("From client-abc:", frame.payload);
});

// Filter by resource and method
client.events$({ resource: "topic", method: "message" }).subscribe((frame) => {
  console.log("Topic message:", frame.header.topic, frame.payload);
});

// Combine filters
client.events$({ topic: "chat", from: "client-abc" }).subscribe((frame) => {
  console.log("Chat from client-abc:", frame.payload);
});

// Listen to all events (no filter)
client.on((frame) => {
  console.log("Any event:", frame.header.resource, frame.header.method, frame.payload);
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, EventFilter

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session")

# Filter by topic
client.events(EventFilter(topic="chat")).subscribe(
    lambda frame: print("Chat event:", frame.payload)
)

# Filter by sender
client.events(EventFilter(from_="client-abc")).subscribe(
    lambda frame: print("From client-abc:", frame.payload)
)

# Filter by resource and method
client.events(EventFilter(resource="topic", method="message")).subscribe(
    lambda frame: print("Topic message:", frame.header.topic, frame.payload)
)

# Combine filters
client.events(EventFilter(topic="chat", from_="client-abc")).subscribe(
    lambda frame: print("Chat from client-abc:", frame.payload)
)

# Listen to all events (no filter)
client.on(lambda frame: print("Any event:", frame.header.resource, frame.header.method, frame.payload))
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session")

// Filter by topic
Task {
    for await frame in client.events(filter: EventFilter(topic: "chat")) {
        print("Chat event:", frame.payload as Any)
    }
}

// Filter by sender
Task {
    for await frame in client.events(filter: EventFilter(from: "client-abc")) {
        print("From client-abc:", frame.payload as Any)
    }
}

// Filter by resource and method
Task {
    for await frame in client.events(filter: EventFilter(resource: "topic", method: "message")) {
        print("Topic message:", frame.header.topic as Any, frame.payload as Any)
    }
}

// Combine filters
Task {
    for await frame in client.events(filter: EventFilter(topic: "chat", from: "client-abc")) {
        print("Chat from client-abc:", frame.payload as Any)
    }
}

// Listen to all events (no filter)
client.on { frame in
    print("Any event:", frame.header.resource, frame.header.method, frame.payload as Any)
}
```

:::

## Explanation

`EventFilter` has four optional fields — all specified fields must match for an event to pass:

| Field | Description |
|-------|-------------|
| `resource` | Target resource (e.g., `"topic"`, `"data"`) |
| `method` | Operation (e.g., `"message"`, `"changed"`) |
| `topic` | Topic name for pub/sub events |
| `from` | Sender's client ID |

- When multiple fields are set, they act as an AND filter — all conditions must be true.
- The `on()` method with no filter receives every event. Use it for logging or debugging.
- `events$()` / `events()` returns an event stream you can subscribe to with callbacks or iterate asynchronously.

## Variations

### Unsubscribe from filtered events

::: code-group

```typescript [TypeScript]
const unsubscribe = client.events$({ topic: "chat" }).subscribe((frame) => {
  console.log(frame.payload);
});

// Later: stop listening
unsubscribe();
```

```python [Python]
unsubscribe = client.events(EventFilter(topic="chat")).subscribe(
    lambda frame: print(frame.payload)
)

# Later: stop listening
unsubscribe()
```

```swift [Swift]
let unsubscribe = client.events(filter: EventFilter(topic: "chat"))
    .subscribe { frame in
        print(frame.payload as Any)
    }

// Later: stop listening
unsubscribe()
```

:::

### Use topic streams instead

For single-topic filtering, `topic$()` / `topic_stream()` / `topicStream()` is more concise:

::: code-group

```typescript [TypeScript]
client.topic$("chat").subscribe((frame) => {
  console.log(frame.payload);
});
```

```python [Python]
client.topic_stream("chat").subscribe(
    lambda frame: print(frame.payload)
)
```

```swift [Swift]
Task {
    for await frame in client.topicStream("chat") {
        print(frame.payload as Any)
    }
}
```

:::
