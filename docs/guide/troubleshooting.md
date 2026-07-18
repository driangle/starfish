# Troubleshooting

## Structured Error Format

When a request fails, the server responds with a frame whose payload contains a structured error:

```json
{
  "header": {
    "id": "msg_2",
    "resource": "session",
    "method": "join",
    "kind": "response",
    "replyTo": "msg_1"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "session.not_found",
      "message": "Session does not exist.",
      "resource": "session",
      "retry": false,
      "details": null
    }
  }
}
```

The SDK surfaces these as `StarfishError` instances with `code`, `message`, `resource`, `retry`, and `details` fields. The `retry` field indicates whether the client should retry the operation.

## Error Codes

### Connection Errors

#### `CONNECTION_FAILED`

The WebSocket connection could not be established.

**Causes:**
- Server is not running
- Wrong server URL
- Firewall or proxy blocking WebSocket connections

**Fix:** Verify the server is running and the URL is correct. Check that your network allows WebSocket connections (some corporate proxies block them).

#### `NO_WEBSOCKET`

No WebSocket implementation is available.

**Causes:**
- Running in Node.js without providing a WebSocket factory

**Fix:** Install `ws` and pass it via the `ws` option:

```ts
import WebSocket from "ws";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  ws: (url) => new WebSocket(url),
});
```

#### `NOT_CONNECTED`

Attempted to send a frame while not connected.

**Causes:**
- Calling `publish`, `send`, `subscribe`, or other methods before `connect()` completes
- Connection dropped and reconnection hasn't succeeded yet

**Fix:** Ensure `await client.connect()` has resolved before calling other methods. Monitor `connection$` to know when you're connected.

#### `CONNECTION_LOST`

The WebSocket connection closed unexpectedly.

**Causes:**
- Network interruption
- Server shutdown or restart
- Idle timeout

**Fix:** The client will automatically attempt to reconnect if `reconnect.enabled` is `true` (the default). Pending requests will be rejected with this error — retry them after reconnection.

#### `DISCONNECTED`

The client was intentionally disconnected.

**Causes:**
- `disconnect()` was called while requests were pending

**Fix:** This is expected behavior. Complete or cancel pending operations before disconnecting.

### Session Errors

#### `NO_SESSION`

Attempted an operation that requires a session without joining one first.

**Causes:**
- Calling `publish`, `subscribe`, `presence.set`, `save`, or `send` before `join()`

**Fix:** Call `await client.join("session-name")` before using session features.

### Data Errors

#### `PAYLOAD_TOO_LARGE`

A payload exceeds the size limit.

**Causes:**
- Presence data exceeds 8 KB
- Data value exceeds 256 KB
- WebSocket message exceeds 64 KB

**Fix:** Reduce the payload size. For large data, store it externally and share a reference. See [Best Practices](./best-practices#size-limits) for all limits.

#### `TOPIC_NAME_TOO_LONG`

A topic name exceeds 128 characters.

**Fix:** Use shorter topic names. Consider using a hierarchical naming scheme like `"drawing/layer1"` instead of encoding data in the topic name.

### WebRTC Errors

#### `RTC_NOT_ENABLED`

Attempted an RTC operation without providing RTC options.

**Fix:** Pass `rtc` options when creating the client:

```ts
const client = new StarfishClient({
  server: "ws://localhost:4000",
  rtc: {
    factory: (config) => new RTCPeerConnection(config),
  },
});
```

#### `TRANSPORT_UNAVAILABLE`

RTC transport was requested with `fallback: false` but no RTC peers are connected.

**Fix:** Either set `fallback: true` (the default) to fall back to WebSocket, or ensure RTC peer connections are established before sending.

## Common Issues

### Messages Not Arriving

1. **Check subscription order:** Set up your `topic$` listener *before* calling `subscribe()` to avoid missing messages that arrive between the subscription and listener setup.

2. **Check session membership:** Both sender and receiver must be in the same session.

3. **Check topic name:** Topic names are case-sensitive. `"Cursor"` and `"cursor"` are different topics.

4. **Check `includeSelf`:** By default, you don't receive your own published messages. Set `delivery.includeSelf: true` if you need them.

### Connection Keeps Dropping

1. **Check heartbeat:** If the server doesn't receive heartbeats within the expected interval, it may close the connection. Ensure no long-running synchronous code blocks the event loop.

2. **Check proxy/load balancer timeouts:** Some proxies close idle WebSocket connections. The heartbeat should prevent this, but verify your proxy's timeout settings.

3. **Check reconnection settings:** If `maxRetries` is too low, the client may give up reconnecting. The default is `Infinity`.

### High Latency

1. **Use unreliable delivery** for high-frequency data like cursor positions. Reliable delivery through the server adds round-trip latency.

2. **Enable WebRTC** for peer-to-peer communication. This bypasses the server for data delivery.

3. **Sync clocks** with `client.clock.sync()` before using time-sensitive features. Without sync, `client.at()` may fire at the wrong time.

### Node.js Specific

**Process doesn't exit after disconnect:**

The WebSocket connection may keep the Node.js event loop alive. Call `disconnect()` and ensure all listeners are cleaned up:

```ts
await client.disconnect();
process.exit(0);
```

**`ws` package version:**

Use `ws` version 8.x or later. Older versions may not support all features used by the SDK.
