# Starfish TypeScript SDK Examples

Node.js scripts demonstrating each feature of the `@starfish/client` SDK.

## Prerequisites

- Node.js 18+
- A running Starfish server at `ws://localhost:8080/starfish` (see [Go server instructions](../../servers/golang/README.md))

## Setup

```bash
# Build the SDK
cd sdks/typescript && npm install && npm run build && cd ../..

# Install example dependencies and build
cd examples/typescript
npm install
npm run build
```

## Examples

### Connection (`npm run connection`)

Client setup, WebSocket handshake, session join/leave, and connection state tracking.

**SDK features:** `StarfishClient`, `connect()`, `join()`, `leave()`, `disconnect()`, `connection$`, `clients$`

### Pub/Sub (`npm run pubsub`)

Two clients in the same session -- one publishes messages to a topic, the other receives them.

**SDK features:** `subscribe()`, `publish()`, `topic$()`, `unsubscribe()`

### Presence (`npm run presence`)

Two clients set and update presence data, observing each other's changes in real-time.

**SDK features:** `presence.set()`, `presence$`, `peers$`

### Shared Data (`npm run shared-data`)

Collaborative state using replace, merge, and counter operations with version tracking.

**SDK features:** `save()`, `get()`, `changed$`, `key$()`

### Clock Sync (`npm run clock-sync`)

Synchronized timing across clients using round-trip measurement and scheduled callbacks.

**SDK features:** `clock.sync()`, `clock.now()`, `clock.offset`, `at()`
