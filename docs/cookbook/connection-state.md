# Handle Connection State Changes

## Problem

You need to show connection status in your UI, disable controls while offline, or trigger logic when the client reconnects.

## Solution

Subscribe to the connection state observable/stream and react to each state transition.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  reconnect: { enabled: true },
});

client.connection$.subscribe((state) => {
  switch (state) {
    case "disconnected":
      showBanner("Disconnected");
      disableControls();
      break;
    case "connecting":
      showBanner("Connecting...");
      break;
    case "connected":
      hideBanner();
      enableControls();
      break;
    case "reconnecting":
      showBanner("Reconnecting...");
      disableControls();
      break;
  }
});

await client.connect();
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, ReconnectOptions, ConnectionState

client = StarfishClient(StarfishClientOptions(
    server="ws://localhost:4000",
    reconnect=ReconnectOptions(enabled=True),
))

def on_state_change(state: ConnectionState):
    if state == ConnectionState.DISCONNECTED:
        show_banner("Disconnected")
        disable_controls()
    elif state == ConnectionState.CONNECTING:
        show_banner("Connecting...")
    elif state == ConnectionState.CONNECTED:
        hide_banner()
        enable_controls()
    elif state == ConnectionState.RECONNECTING:
        show_banner("Reconnecting...")
        disable_controls()

client.connection_state.subscribe(on_state_change)

await client.connect()
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!,
    reconnect: ReconnectOptions(enabled: true)
))

Task {
    for await state in client.connectionState {
        switch state {
        case .disconnected:
            showBanner("Disconnected")
            disableControls()
        case .connecting:
            showBanner("Connecting...")
        case .connected:
            hideBanner()
            enableControls()
        case .reconnecting:
            showBanner("Reconnecting...")
            disableControls()
        }
    }
}

try await client.connect()
```

:::

## Explanation

The connection lifecycle has four states:

```
disconnected → connecting → connected
                    ↑            ↓
              reconnecting ←─────┘ (on connection loss)
```

- **`disconnected`** — not connected and not trying. This is the initial state and the state after calling `disconnect()` or exhausting all retries.
- **`connecting`** — establishing the initial connection.
- **`connected`** — fully connected and ready to send/receive.
- **`reconnecting`** — lost connection, attempting to reconnect. With reconnection enabled, the client will retry with exponential backoff.

The observable/stream fires on every transition, so you can update your UI or pause operations accordingly.

## Variations

### Read the current state synchronously

::: code-group

```typescript [TypeScript]
// Access the current value without subscribing
const currentState = client.connection$.value;
if (currentState === "connected") {
  client.publish("chat", { text: "I'm online!" });
}
```

```python [Python]
# Access the current value without subscribing
current_state = client.connection_state.value
if current_state == ConnectionState.CONNECTED:
    await client.publish("chat", {"text": "I'm online!"})
```

```swift [Swift]
// Use the observable's current value
// Note: In Swift, check the stream for the latest state
// or maintain your own @Published property from the stream
```

:::

### Guard actions behind connection state

::: code-group

```typescript [TypeScript]
function safeSend(client, to, payload) {
  if (client.connection$.value !== "connected") {
    console.warn("Not connected — message not sent");
    return;
  }
  client.send(to, payload);
}
```

```python [Python]
async def safe_send(client, to, payload):
    if client.connection_state.value != ConnectionState.CONNECTED:
        print("Not connected — message not sent")
        return
    await client.send(to, payload)
```

```swift [Swift]
func safeSend(_ client: StarfishClient, to: String, payload: AnyCodable) {
    do {
        try client.send(to: to, payload: payload)
    } catch {
        print("Not connected — message not sent")
    }
}
```

:::
