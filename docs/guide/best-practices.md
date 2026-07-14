# Best Practices

## Error Handling

All SDKs throw `StarfishError` with a `code`, `message`, and optional `details`. Handle errors based on the code:

::: code-group

```ts [TypeScript]
import { StarfishError } from "@starfish/client";

try {
  await client.connect();
  await client.join("my-session");
} catch (err) {
  if (err instanceof StarfishError) {
    switch (err.code) {
      case "CONNECTION_FAILED":
        console.error("Could not reach server");
        break;
      case "NO_WEBSOCKET":
        console.error("Provide a WebSocket factory for Node.js");
        break;
      default:
        console.error(`Starfish error [${err.code}]: ${err.message}`);
    }
  }
}
```

```python [Python]
from starfish import StarfishError

try:
    await client.connect()
    await client.join("my-session")
except StarfishError as err:
    if err.code == "CONNECTION_FAILED":
        print("Could not reach server")
    else:
        print(f"Starfish error [{err.code}]: {err}")
```

```swift [Swift]
import StarfishClient

do {
    try await client.connect()
    try await client.join(session: "my-session")
} catch let error as StarfishError {
    switch error.code {
    case "CONNECTION_FAILED":
        print("Could not reach server")
    default:
        print("Starfish error [\(error.code)]: \(error.message)")
    }
}
```

:::

## Reconnection Strategies

The default reconnection settings work well for most cases, but you may want to tune them:

**Interactive applications** (live performances, real-time collaboration):

```ts
{
  reconnect: {
    enabled: true,
    maxRetries: Infinity,
    baseDelay: 500,   // start retrying faster
    maxDelay: 10_000, // cap at 10 seconds
  },
}
```

**Background connections** (monitoring, logging):

```ts
{
  reconnect: {
    enabled: true,
    maxRetries: 20,
    baseDelay: 2000,
    maxDelay: 60_000,
  },
}
```

**No reconnection** (one-shot connections):

```ts
{
  reconnect: { enabled: false },
}
```

Monitor connection state to update your UI:

::: code-group

```ts [TypeScript]
client.connection$.subscribe((state) => {
  switch (state) {
    case "connected":
      showStatus("Connected");
      break;
    case "reconnecting":
      showStatus("Reconnecting...");
      break;
    case "disconnected":
      showStatus("Disconnected");
      break;
  }
});
```

```python [Python]
client.connection_state.subscribe(lambda state: show_status(state))
```

```swift [Swift]
Task {
    for await state in client.connectionState {
        showStatus(state.rawValue)
    }
}
```

:::

## Delivery Option Tradeoffs

Choose the right delivery mode for your use case:

| Use Case | Reliability | Why |
|----------|-------------|-----|
| Chat messages | `reliable` (default) | Every message must arrive |
| Cursor positions | `unreliable` | Dropped messages are fine — the next update replaces it |
| Slider values | `latest` | Only the most recent value matters |
| Game state snapshots | `reliable` | State must be consistent |
| Audio/video metadata | `unreliable` | Low latency matters more than completeness |
| Sensor readings | `unreliable` | High frequency, latest value is what counts |

When WebRTC is enabled, `unreliable` and `latest` messages prefer the RTC transport for lower latency. `reliable` messages use WebSocket by default, ensuring server-side persistence and ordering.

## Resource Cleanup

Always clean up when you're done to avoid memory leaks and stale connections.

### Unsubscribe from Observables

Every `.subscribe()` call returns an unsubscribe function. Call it when you no longer need updates:

```ts
const unsub = client.topic$("cursor").subscribe((frame) => {
  renderCursor(frame.payload);
});

// Later, when cleaning up:
unsub();
```

### Unsubscribe from Topics

Unsubscribing from a topic tells the server to stop sending you messages:

```ts
await client.unsubscribe("cursor");
```

### Leave and Disconnect

When your client is done, leave the session and disconnect:

```ts
await client.leave();
await client.disconnect();
```

`disconnect()` automatically stops the heartbeat, clears presence, closes RTC connections, and tears down the WebSocket.

### Full Cleanup Example

```ts
// Store all unsubscribe functions
const cleanups: (() => void)[] = [];

cleanups.push(client.topic$("cursor").subscribe(handleCursor));
cleanups.push(client.presence$.subscribe(handlePresence));
cleanups.push(client.connection$.subscribe(handleState));

// On shutdown
function cleanup() {
  cleanups.forEach((fn) => fn());
  client.disconnect();
}
```

## Size Limits

Be aware of payload size limits to avoid `PAYLOAD_TOO_LARGE` errors:

| Limit | Size |
|-------|------|
| WebSocket message | 64 KB |
| RTC control channel message | 64 KB |
| RTC stream channel message | 16 KB |
| Presence data (per client) | 8 KB |
| Data value (per save) | 256 KB |
| Topic name length | 128 characters |
| Client meta | 16 KB |

If you need to send larger data, consider splitting it into chunks or using an external storage service and sharing references via Starfish.
