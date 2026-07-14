# Starfish p5.js Adapter

p5.js integration for [Starfish](https://github.com/driangle/starfish), built on the [TypeScript client](../../clients/typescript).

Adds realtime presence, topic messaging, shared data, and peer-to-peer communication to p5.js sketches.

## Installation

```bash
npm install @driangle/starfish-p5
```

Or include the global build via a `<script>` tag:

```html
<script src="https://unpkg.com/@driangle/starfish-p5/dist/starfish-p5.global.js"></script>
```

The global build exposes `starfishP5` and `StarfishP5` on `window`.

## Quick Start

```javascript
let sf;

function setup() {
  createCanvas(400, 400);

  sf = starfishP5({
    url: "ws://localhost:8080/starfish",
    session: "my-sketch",
    name: "Player-" + floor(random(1000)),
  });

  sf.start();
}

function draw() {
  background(220);

  // Broadcast your cursor position
  sf.setPresence({ x: mouseX, y: mouseY });

  // Draw each peer's cursor
  sf.eachPeer((peer) => {
    ellipse(peer.presence.x, peer.presence.y, 20, 20);
  });
}
```

## Options

```typescript
starfishP5({
  url: string;                // WebSocket server URL
  session: string;            // Session to join
  p5?: P5Instance;            // p5 instance — enables automatic cleanup on sketch removal
  name?: string;              // Display name (included in presence data)
  meta?: Record<string, unknown>;  // Custom metadata (included in presence data)
  presence?: {
    throttleMs?: number;      // Min interval between presence updates (default: 50ms)
  };
  auth?: { type: string; token?: string };  // Authentication
  reconnect?: ReconnectOptions;             // Reconnection settings
});
```

## API

### Lifecycle

| Method                   | Description                            |
| ------------------------ | -------------------------------------- |
| `start(): Promise<void>` | Connect to server and join the session |
| `stop(): Promise<void>`  | Disconnect and clean up subscriptions  |

### Properties

| Property    | Type             | Description                                  |
| ----------- | ---------------- | -------------------------------------------- |
| `connected` | `boolean`        | Whether the client is connected              |
| `clientId`  | `string \| null` | This client's unique ID (assigned by server) |
| `peers`     | `PeerPresence[]` | Connected peers (excluding self)             |
| `client`    | `StarfishClient` | Underlying client instance for advanced use  |

### Presence

```javascript
// Broadcast your state (throttled — calls within throttleMs are dropped)
sf.setPresence({ x: mouseX, y: mouseY, color: "#ff0" });

// Iterate over peers
sf.eachPeer((peer) => {
  // peer.id       — unique ID
  // peer.name     — display name (from options.name)
  // peer.presence — latest presence data
  console.log(peer.name, peer.presence.x, peer.presence.y);
});
```

### Topics (Pub/Sub)

```javascript
// Subscribe — can be called before start(), subscriptions are queued
sf.on("stroke", (payload, from) => {
  line(payload.x1, payload.y1, payload.x2, payload.y2);
});

// Publish
sf.emit("stroke", { x1: pmouseX, y1: pmouseY, x2: mouseX, y2: mouseY });
```

### Shared Data

Session-scoped key-value storage visible to all peers.

```javascript
// Write
await sf.setShared("bg", { r: 240, g: 240, b: 240 });

// Read (from local cache)
const bg = sf.getShared("bg");

// Watch for changes
sf.onShared("bg", (data) => {
  background(data.r, data.g, data.b);
});
```

### Direct Messaging

```javascript
// Send to a specific peer
sf.sendTo(peerId, { type: "invite" });

// Broadcast to all peers
sf.broadcast({ type: "ping" });
```

## Examples

See the [`examples/`](./examples) directory:

- **[Shared Cursors](./examples/cursors)** — each peer sees the others' mouse position in real time
- **[Shared Canvas](./examples/shared-canvas)** — collaborative drawing with topic pub/sub and shared background color

To run an example, start a [Starfish server](../../servers) and open the example's `index.html` in multiple browser tabs.

## License

MIT
