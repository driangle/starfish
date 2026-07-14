# Configuration

The client is configured through an options object passed to the constructor. This page documents every available option.

## Client Options

::: code-group

```ts [TypeScript]
import { StarfishClient } from "@starfish/client";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  ws: (url) => new WebSocket(url),
  client: {
    name: "my-app",
    role: "performer",
    meta: { version: "1.0" },
  },
  auth: { type: "token", token: "my-secret" },
  reconnect: {
    enabled: true,
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30_000,
  },
  rtc: {
    factory: (config) => new RTCPeerConnection(config),
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  },
});
```

```python [Python]
from starfish import (
    StarfishClient,
    StarfishClientOptions,
    ClientIdentity,
    AuthOptions,
    ReconnectOptions,
)

client = StarfishClient(StarfishClientOptions(
    server="ws://localhost:4000",
    client=ClientIdentity(
        name="my-app",
        role="performer",
        meta={"version": "1.0"},
    ),
    auth=AuthOptions(type="token", token="my-secret"),
    reconnect=ReconnectOptions(
        enabled=True,
        max_retries=10,
        base_delay=1000,
        max_delay=30_000,
    ),
))
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!,
    client: ClientIdentity(
        name: "my-app",
        role: "performer",
        meta: ["version": "1.0"]
    ),
    auth: AuthConfig(type: "token", token: "my-secret"),
    reconnect: ReconnectOptions(
        enabled: true,
        maxRetries: 10,
        baseDelay: 1.0,
        maxDelay: 30.0
    )
))
```

:::

## Options Reference

### `server`

The WebSocket URL of the Starfish server.

| | TypeScript | Python | Swift |
|-|-----------|--------|-------|
| **Type** | `string` | `str` | `URL` |
| **Required** | Yes | Yes | Yes |

### `ws` / `ws_factory` / `webSocketFactory`

A factory function that creates a WebSocket connection. Required in Node.js where no global `WebSocket` exists. Browsers and Python use their built-in implementations by default.

::: code-group

```ts [TypeScript]
// Node.js
import WebSocket from "ws";
{ ws: (url) => new WebSocket(url) }
```

```python [Python]
# Custom factory (optional — default uses websockets library)
{ ws_factory: my_custom_factory }
```

```swift [Swift]
// Custom factory (optional — default uses URLSession)
{ webSocketFactory: { url in MyCustomTransport(url: url) } }
```

:::

### `client`

Identity information sent to the server during the handshake.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string` | `"starfish-client"` | Display name for this client |
| `role` | `string` | `"default"` | Client role (application-defined) |
| `meta` | `object` | `{}` | Arbitrary metadata |

### `auth`

Authentication credentials sent during the handshake.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `string` | `"none"` | Auth type (e.g. `"none"`, `"token"`) |
| `token` | `string?` | — | Auth token value |

### `reconnect`

Controls automatic reconnection when the connection drops. The client uses exponential backoff with jitter.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable automatic reconnection |
| `maxRetries` | `number` | `Infinity` | Maximum reconnection attempts |
| `baseDelay` | `number` | `1000` | Initial delay in milliseconds |
| `maxDelay` | `number` | `30000` | Maximum delay cap in milliseconds |

The delay formula is: `min(baseDelay * 2^attempt + random jitter, maxDelay)`

### `rtc` (TypeScript only)

Enables WebRTC peer-to-peer connections. When provided, the client can establish direct data channels with other peers for low-latency communication.

| Field | Type | Description |
|-------|------|-------------|
| `factory` | `(config?) => RTCPeerConnection` | Factory to create RTCPeerConnection instances |
| `iceServers` | `object[]` | ICE server configuration for NAT traversal |

```ts
{
  rtc: {
    factory: (config) => new RTCPeerConnection(config),
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  },
}
```

::: tip
WebRTC is optional. Without it, all communication goes through the WebSocket server. Enable it when you need lower latency for high-frequency updates like cursor positions or sensor data.
:::

## Join Options

Options passed when joining a session:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `name` | `string?` | Client ID | Display name in the session |
| `role` | `string?` | `"default"` | Role in the session |
| `meta` | `object?` | `{}` | Session-specific metadata |
| `create` | `boolean?` | `true` | Create the session if it doesn't exist |
