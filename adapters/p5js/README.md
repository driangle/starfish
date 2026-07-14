# Starfish p5.js Adapter

p5.js integration for [Starfish](https://github.com/driangle/starfish), built on the TypeScript SDK.

Adds realtime presence, topic messaging, shared data, and peer-to-peer communication to p5.js sketches.

## Installation

```bash
npm install @driangle/starfish-p5
```

Or include the global build via a `<script>` tag:

```html
<script src="https://unpkg.com/@driangle/starfish-p5/dist/starfish-p5.global.js"></script>
```

## Quick Start

```javascript
let sf;

function setup() {
  createCanvas(400, 400);
  sf = starfishP5({ url: "ws://localhost:8080", session: "my-sketch", p5: this });
  sf.start();
}

function draw() {
  background(220);
  sf.setPresence({ x: mouseX, y: mouseY });
  sf.eachPeer((peer) => {
    ellipse(peer.presence.x, peer.presence.y, 20, 20);
  });
}
```

## API

- **`starfishP5(options)`** / **`new StarfishP5(options)`** — create an adapter instance
- **`start()` / `stop()`** — connect/disconnect
- **`setPresence(data)`** — broadcast your state (throttled)
- **`peers`** / **`eachPeer(fn)`** — read other clients' presence
- **`on(topic, cb)` / `emit(topic, payload)`** — pub/sub messaging
- **`setShared(key, data)` / `getShared(key)` / `onShared(key, cb)`** — shared session data
- **`sendTo(peerId, payload)` / `broadcast(payload)`** — direct and broadcast messaging

## License

MIT
