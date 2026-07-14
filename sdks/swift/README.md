# StarfishClient — Swift SDK

Native Swift client library for the Starfish realtime protocol. Provides async/await APIs for connection management, sessions, pub/sub topics, direct messaging, presence, shared data, clock synchronization, and events.

## Requirements

- Swift 5.9+
- iOS 16+ / macOS 13+ / tvOS 16+ / watchOS 9+

## Installation

Add to your `Package.swift`:

```swift
dependencies: [
    .package(path: "../path/to/sdks/swift")
]
```

Then add `"StarfishClient"` to your target's dependencies.

## Quick Start

```swift
import StarfishClient

// Create client
let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:8080/starfish")!,
    client: ClientIdentity(name: "my-app", role: "user")
))

// Connect and join a session
try await client.connect()
try await client.join(session: "my-room")

// Subscribe to a topic
try await client.subscribe(topic: "chat")

// Listen for messages
Task {
    for await frame in client.topicStream("chat") {
        print("Received: \(frame.payload)")
    }
}

// Publish a message
try client.publish(topic: "chat", payload: AnyCodable(["text": "Hello!"]))

// Send a direct message
try client.send(to: "peer-client-id", payload: AnyCodable(["gesture": "wave"]))

// Broadcast to all peers
try client.broadcast(payload: AnyCodable("hey everyone"))

// Disconnect
client.disconnect()
```

## API Overview

### Connection

```swift
try await client.connect()          // Connect to server
client.disconnect()                  // Disconnect

// Observe connection state changes
for await state in client.connectionState {
    print("State: \(state)")  // .disconnected, .connecting, .connected, .reconnecting
}
```

### Sessions

```swift
try await client.join(session: "room", options: JoinOptions(name: "Alice"))
try client.leave()

// Observe connected clients
for await clients in client.clients { ... }
for await peers in client.peers { ... }     // Excludes self
```

### Topics (Pub/Sub)

```swift
try await client.subscribe(topic: "events")
try client.unsubscribe(topic: "events")
try client.publish(topic: "events", payload: AnyCodable(["action": "fire"]))

for await frame in client.topicStream("events") {
    print("From \(frame.from): \(frame.payload)")
}
```

### Direct Messaging

```swift
try client.send(to: "client-id", payload: AnyCodable("hello"))
try client.send(to: .multiple(["a", "b"]), payload: AnyCodable("hi"))
try client.broadcast(payload: AnyCodable("hey"))
```

### Presence

```swift
try client.presence.set(AnyCodable(["status": "online"]))

for await presenceMap in client.presenceStream {
    for (clientId, data) in presenceMap {
        print("\(clientId): \(data)")
    }
}
```

### Shared Data

```swift
// Save data
let result = try await client.save(SaveOptions(
    key: "game-state",
    scope: .session,
    op: .merge,
    data: AnyCodable(["score": 100])
))

// Get data
let data = try await client.get(key: "game-state", scope: .session)

// Observe changes
for await change in client.keyStream("game-state") {
    print("Version \(change.version): \(change.data)")
}
```

### Clock Synchronization

```swift
try await client.clock.sync()
let serverTime = client.clock.now()

// Schedule at server time
client.at(serverTime: serverTime + 5000) {
    print("5 seconds on server clock")
}
```

### Events

```swift
// All events
for await frame in client.events() { ... }

// Filtered events
for await frame in client.events(filter: EventFilter(type: "topic.message", topic: "chat")) {
    print("Chat message: \(frame.payload)")
}

// Callback-based
let unsub = client.on { frame in
    print("Event: \(frame.type)")
}
unsub() // Stop listening
```

### Reconnection

Auto-reconnection is enabled by default with exponential backoff:

```swift
let client = StarfishClient(options: StarfishClientOptions(
    server: url,
    reconnect: ReconnectOptions(
        enabled: true,
        maxRetries: 10,
        baseDelay: 1.0,    // seconds
        maxDelay: 30.0     // seconds
    )
))
```

### Custom WebSocket Transport

Provide a custom WebSocket implementation for testing or alternative transports:

```swift
let client = StarfishClient(options: StarfishClientOptions(
    server: url,
    webSocketFactory: { url in
        MyCustomWebSocket(url: url)
    }
))
```

Your transport must conform to the `WebSocketTransport` protocol:

```swift
public protocol WebSocketTransport: Sendable {
    func send(_ string: String) async throws
    func receive() async throws -> String
    func close(code: URLSessionWebSocketTask.CloseCode) async
}
```

## Data Operations

The `DataOp` enum supports these operations on shared data:

| Operation | Description |
|-----------|-------------|
| `.replace` | Replace entire value |
| `.merge` | Shallow merge object |
| `.setAdd` | Add item to set |
| `.setRemove` | Remove item from set |
| `.listAdd` | Append to list |
| `.listRemove` | Remove from list |
| `.counterAdd` | Increment counter |
| `.delete` | Remove key entirely |

## Testing

Run tests:

```bash
swift test --package-path sdks/swift
```
