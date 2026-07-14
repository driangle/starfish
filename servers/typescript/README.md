# Starfish TypeScript Server

TypeScript server implementation for the [Starfish](https://github.com/driangle/starfish) realtime protocol.

Handles sessions, presence, topic pub/sub, direct and broadcast messaging, shared data operations, and event streams over WebSocket with optional WebRTC signaling.

## Installation

```bash
npm install @driangle/starfish-server
```

## Quick Start

### CLI

```bash
npx @driangle/starfish-server
# Starfish server listening on :8080

npx @driangle/starfish-server --port 3000
# Starfish server listening on :3000
```

### Programmatic

```typescript
import { Hub, defaultConfig } from "@driangle/starfish-server";

const config = defaultConfig();
config.port = 3000;

const hub = new Hub(config);
hub.start();
```

## Configuration

`defaultConfig()` returns a `StarfishConfig` with these defaults:

| Option | Default | Description |
|---|---|---|
| `port` | `8080` | HTTP/WebSocket server port |
| `heartbeatIntervalMs` | `15000` | Heartbeat ping interval (ms) |
| `heartbeatTimeoutMs` | `30000` | Time before disconnecting an unresponsive client (ms) |
| `resumeTimeoutMs` | `30000` | Window for a disconnected client to resume its session (ms) |
| `maxWsMessageSize` | `65536` | Maximum WebSocket message size (bytes) |
| `iceServers` | `[{ urls: "stun:stun.l.google.com:19302" }]` | ICE servers for WebRTC signaling |

## API

The package exports the core building blocks for extending or embedding the server:

- **`Hub`** — top-level server: manages clients, sessions, and the WebSocket listener
- **`Handler`** — frame dispatcher that routes incoming messages to the appropriate handler
- **`Session`** / **`Client`** — session and client models
- **`defaultConfig`** / **`StarfishConfig`** — configuration factory and type
- **Handler functions** — `handleSessionJoin`, `handleTopicPublish`, `handlePresenceSet`, etc.
- **Error codes** — `ERR_AUTH_REQUIRED`, `ERR_SESSION_FULL`, `ERR_PAYLOAD_TOO_LARGE`, etc.
- **Limits** — `MAX_WS_MESSAGE_SIZE`, `MAX_PRESENCE_SIZE`, `MAX_DATA_VALUE_SIZE`, etc.

## Development

```bash
npm run build        # Compile TypeScript
npm run check        # Type-check without emitting
npm run lint         # Run ESLint
npm test             # Run tests (vitest)
npm run test:watch   # Run tests in watch mode
```

## License

MIT
