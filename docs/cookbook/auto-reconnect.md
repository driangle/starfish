# Connect with Automatic Reconnection

## Problem

Your application loses its WebSocket connection due to network instability, server restarts, or mobile network switches. You need it to automatically reconnect with exponential backoff.

## Solution

Configure `ReconnectOptions` when creating your client. Starfish handles retry logic with exponential backoff and jitter automatically.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  reconnect: {
    enabled: true,
    maxRetries: 10,
    baseDelay: 1000,   // start at 1 second
    maxDelay: 30_000,  // cap at 30 seconds
  },
});

// Monitor connection state to react to reconnections
client.connection$.subscribe((state) => {
  console.log("Connection:", state);
  // "connecting" | "connected" | "reconnecting" | "disconnected"
});

await client.connect();
await client.join("my-session");
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, ReconnectOptions

client = StarfishClient(StarfishClientOptions(
    server="ws://localhost:4000",
    reconnect=ReconnectOptions(
        enabled=True,
        max_retries=10,
        base_delay=1000,   # start at 1 second
        max_delay=30_000,  # cap at 30 seconds
    ),
))

# Monitor connection state
client.connection_state.subscribe(lambda state: print(f"Connection: {state}"))

await client.connect()
await client.join("my-session")
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!,
    reconnect: ReconnectOptions(
        enabled: true,
        maxRetries: 10,
        baseDelay: 1.0,   // start at 1 second
        maxDelay: 30.0     // cap at 30 seconds
    )
))

// Monitor connection state
Task {
    for await state in client.connectionState {
        print("Connection: \(state)")
    }
}

try await client.connect()
try await client.join(session: "my-session")
```

:::

## Explanation

The reconnection system uses exponential backoff with jitter:

- **`enabled`** — turn automatic reconnection on or off (default: `true`)
- **`maxRetries`** — maximum number of reconnection attempts before giving up
- **`baseDelay`** — initial delay between retries in milliseconds (seconds in Swift)
- **`maxDelay`** — upper bound on the delay between retries

When the connection drops, the client transitions to `reconnecting` state and begins retrying. After a successful reconnect it automatically rejoins any previously joined session and resubscribes to topics.

## Variations

### Infinite retries (default behavior)

Omit `maxRetries` to retry indefinitely — useful for always-on installations:

::: code-group

```typescript [TypeScript]
const client = new StarfishClient({
  server: "ws://localhost:4000",
  reconnect: { enabled: true },
});
```

```python [Python]
client = StarfishClient(StarfishClientOptions(
    server="ws://localhost:4000",
    reconnect=ReconnectOptions(enabled=True),
))
```

```swift [Swift]
let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!,
    reconnect: .defaults
))
```

:::

### Disable reconnection

For short-lived scripts or tests where you want a clean failure:

::: code-group

```typescript [TypeScript]
const client = new StarfishClient({
  server: "ws://localhost:4000",
  reconnect: { enabled: false },
});
```

```python [Python]
client = StarfishClient(StarfishClientOptions(
    server="ws://localhost:4000",
    reconnect=ReconnectOptions(enabled=False),
))
```

```swift [Swift]
let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!,
    reconnect: ReconnectOptions(enabled: false)
))
```

:::
