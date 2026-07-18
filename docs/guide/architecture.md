# Architecture

This page explains how the Starfish client manages connections, communicates with the server, and selects transports.

## Connection Lifecycle

When you call `connect()`, the client:

1. Opens a WebSocket connection to the server URL
2. Sends a hello frame (`resource: "client"`, `method: "hello"`) with your client identity, supported protocol versions, auth credentials, and capabilities
3. Receives a welcome response (`resource: "client"`, `method: "welcome"`) containing the negotiated protocol version, your assigned `clientId`, a `resumeToken`, the heartbeat interval, and the server's current time
4. Transitions to the `connected` state and starts the heartbeat

```
Client                                 Server
  |                                      |
  |-- WebSocket connect ---------------->|
  |                                      |
  |-- hello { versions: [2],          -->|
  |     client, auth, capabilities }     |
  |                                      |
  |<-- welcome { version: 2,            |
  |     clientId, resumeToken,           |
  |     heartbeatInterval,            ---|
  |     serverTime }                     |
  |                                      |
  |   [connected]                        |
```

After connecting, the client starts a heartbeat that sends periodic pings to keep the connection alive. The server provides the heartbeat interval (default 15 seconds).

## Version Negotiation

During the handshake, the client sends a list of protocol versions it supports in the hello frame's `versions` field. The server selects the highest mutually supported version and includes it in the welcome response's `version` field.

```json
// Client hello
{
  "header": {
    "v": 2,
    "id": "hello_1",
    "resource": "client",
    "method": "hello",
    "kind": "request"
  },
  "payload": {
    "versions": [2],
    "client": { "name": "my-app", "role": "player" },
    "auth": { "type": "none" },
    "capabilities": { "rtc": true }
  }
}

// Server welcome
{
  "header": {
    "id": "welcome_1",
    "resource": "client",
    "method": "welcome",
    "kind": "response",
    "replyTo": "hello_1"
  },
  "payload": {
    "status": "ok",
    "version": 2,
    "clientId": "client_xyz",
    "resumeToken": "rt_123",
    "resumeTimeout": 30000,
    "serverTime": 1700000000000,
    "heartbeatInterval": 15000
  }
}
```

After the handshake completes, the `v` field is implicit (the negotiated version) and may be omitted from subsequent frames.

## Frame Protocol

Every message between client and server is a **frame** — a JSON object with a two-level envelope structure. The `header` contains routing and protocol metadata, while the `payload` carries the application data:

```json
{
  "header": {
    "id": "pub_42",
    "resource": "topic",
    "method": "publish",
    "kind": "event",
    "session": "my-session",
    "topic": "cursor",
    "delivery": { "reliability": "unreliable" }
  },
  "payload": { "x": 100, "y": 200 }
}
```

Instead of a single `type` string (e.g. `"topic.publish"`), frames use three fields to describe their intent:

- **`resource`** — the target resource category (e.g. `"topic"`, `"session"`, `"data"`)
- **`method`** — the operation to perform (e.g. `"publish"`, `"join"`, `"save"`)
- **`kind`** — the message role: `"request"`, `"response"`, or `"event"`

### Resources and Methods

| Category | Resource | Methods |
|----------|----------|---------|
| **Connection** | `client` | `hello`, `welcome`, `connected`, `disconnected` |
| **Session** | `session` | `join`, `leave`, `broadcast` |
| **Topics** | `topic` | `subscribe`, `unsubscribe`, `publish`, `message`, `peers` |
| **Messaging** | `message` | `send` |
| **Presence** | `presence` | `set`, `updated` |
| **Data** | `data` | `save`, `get`, `changed` |
| **Clock** | `clock` | `sync` |
| **WebRTC** | `rtc` | `offer`, `answer`, `candidate`, ... |

### Request/Reply

Frames with `kind: "request"` expect a corresponding `kind: "response"` frame. The response includes a `replyTo` field matching the original request's `id`. This is used for `join`, `subscribe`, `save`, `get`, and `clock.sync`. Requests time out after 10 seconds by default.

## Transport Selection

The client supports two transports:

- **WebSocket (WS)** — reliable, ordered, server-relayed. Used for all control plane operations.
- **WebRTC (RTC)** — peer-to-peer data channels. Optional, used for low-latency data when both peers have RTC connections.

### Auto Selection Rules

When `preferTransport` is `"auto"` (the default), the client picks the transport based on the resource/method and delivery options:

| Resource / Method | Reliability | Transport |
|-------------------|-------------|-----------|
| `data/*`, `session/*`, `presence/*` | any | Always WS |
| `session` / `broadcast` | any | Always WS |
| `topic` / `publish` | `reliable` | WS |
| `topic` / `publish` | `unreliable` / `latest` | RTC if peers connected, else WS |
| `message` / `send` | `reliable` | RTC if connected, else WS |
| `message` / `send` | `unreliable` / `latest` | RTC preferred, WS fallback |

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
