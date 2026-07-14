# Architecture

This page explains how the Starfish client manages connections, communicates with the server, and selects transports.

## Connection Lifecycle

When you call `connect()`, the client:

1. Opens a WebSocket connection to the server URL
2. Sends a `client.hello` frame with your client identity, auth credentials, and capabilities
3. Receives a `server.welcome` frame containing your assigned `clientId`, a `resumeToken`, the heartbeat interval, and the server's current time
4. Transitions to the `connected` state and starts the heartbeat

```
Client                          Server
  |                               |
  |-- WebSocket connect --------->|
  |                               |
  |-- client.hello { client,   -->|
  |     auth, capabilities }      |
  |                               |
  |<-- server.welcome { clientId, |
  |     resumeToken,              |
  |     heartbeatInterval,     ---|
  |     serverTime }              |
  |                               |
  |   [connected]                 |
```

After connecting, the client starts a heartbeat that sends periodic pings to keep the connection alive. The server provides the heartbeat interval (default 15 seconds).

## Frame Protocol

Every message between client and server is a **frame** — a JSON object with a standard structure:

```json
{
  "v": 1,
  "id": "pub_42",
  "type": "topic.publish",
  "session": "my-session",
  "topic": "cursor",
  "payload": { "x": 100, "y": 200 },
  "options": {
    "delivery": { "reliability": "unreliable" }
  }
}
```

### Frame Types

| Category | Types |
|----------|-------|
| **Connection** | `client.hello`, `server.welcome` |
| **Session** | `session.join`, `session.leave`, `session.broadcast`, `client.connected`, `client.disconnected` |
| **Topics** | `topic.subscribe`, `topic.unsubscribe`, `topic.publish`, `topic.message`, `topic.peers` |
| **Presence** | `presence.set`, `presence.updated` |
| **Data** | `data.save`, `data.get`, `data.changed` |
| **Clock** | `clock.sync` |
| **WebRTC** | `rtc.*` (signaling frames) |

### Request/Reply

Some frames use a request/reply pattern. The client sends a frame with an `id` and waits for a response frame with the same `id`. This is used for `join`, `subscribe`, `save`, `get`, and `clock.sync`. Requests time out after 10 seconds by default.

## Transport Selection

The client supports two transports:

- **WebSocket (WS)** — reliable, ordered, server-relayed. Used for all control plane operations.
- **WebRTC (RTC)** — peer-to-peer data channels. Optional, used for low-latency data when both peers have RTC connections.

### Auto Selection Rules

When `preferTransport` is `"auto"` (the default), the client picks the transport based on the frame type and delivery options:

| Frame Type | Reliability | Transport |
|------------|-------------|-----------|
| `data.*`, `session.*`, `presence.*` | any | Always WS |
| `session.broadcast` | any | Always WS |
| `topic.publish` | `reliable` | WS |
| `topic.publish` | `unreliable` / `latest` | RTC if peers connected, else WS |
| `client.send` | `reliable` | RTC if connected, else WS |
| `client.send` | `unreliable` / `latest` | RTC preferred, WS fallback |

### Explicit Transport Selection

Override auto selection with `preferTransport`:

```ts
client.publish("sensor", data, {
  delivery: {
    preferTransport: "rtc",  // Force RTC
    fallback: true,          // Fall back to WS if RTC unavailable
  },
});
```

Setting `fallback: false` with `preferTransport: "rtc"` throws a `TRANSPORT_UNAVAILABLE` error if no RTC peers are connected.

### RTC Data Channels

When RTC is enabled, the client uses two data channels per peer:

| Channel | Purpose |
|---------|---------|
| `starfish.control` | Reliable messages (default for `reliable` delivery) |
| `starfish.stream` | Unreliable messages (used for `unreliable` and `latest` delivery) |

## Reconnection

When the WebSocket connection drops unexpectedly, the client automatically attempts to reconnect:

1. Connection state changes to `reconnecting`
2. Client waits for a delay calculated as: `min(baseDelay * 2^attempt + random jitter, maxDelay)`
3. Client attempts to reconnect, sending the `resumeToken` from the previous session
4. If successful, state returns to `connected` and the attempt counter resets
5. If the attempt fails, the delay increases exponentially and the next attempt is scheduled
6. After `maxRetries` failures, state transitions to `disconnected`

```
connected → [connection lost] → reconnecting → [attempt 1: 1s delay]
                                    ↓ fail
                                reconnecting → [attempt 2: 2s delay]
                                    ↓ fail
                                reconnecting → [attempt 3: 4s delay]
                                    ↓ success
                                  connected
```

The default reconnection settings are:

| Setting | Default |
|---------|---------|
| `enabled` | `true` |
| `maxRetries` | `Infinity` |
| `baseDelay` | `1000ms` |
| `maxDelay` | `30000ms` |

See [Configuration](./configuration#reconnect) for how to customize these values.

## Clock Synchronization

The `Clock` class estimates the offset between the client's local clock and the server's clock using a multi-sample round-trip approach:

1. Client records local time `t1` and sends a `clock.sync` frame
2. Server responds with its current `serverTime`
3. Client records local time `t4` when the response arrives
4. Offset is estimated as: `serverTime + (RTT / 2) - t4`
5. This is repeated for multiple samples (default 5), and the median offset is used

Once synced, `clock.now()` returns server-adjusted time and `client.at(serverTime, callback)` schedules a callback to fire at a specific server time — useful for synchronized events across multiple clients.
