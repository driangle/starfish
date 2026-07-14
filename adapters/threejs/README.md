# Starfish Three.js Adapter

Three.js integration for [Starfish](https://github.com/driangle/starfish), built on the TypeScript SDK.

Adds realtime presence, peer lifecycle callbacks, topic messaging, shared data, and peer-to-peer communication to Three.js scenes.

## Installation

```bash
npm install @driangle/starfish-three
```

## Quick Start

```typescript
import { starfishThree } from "@driangle/starfish-three";

const sf = starfishThree({
  url: "ws://localhost:8080",
  session: "my-scene",
  peers: {
    onJoin: (peer) => console.log("joined:", peer.id),
    onUpdate: (peer) => updateAvatar(peer.id, peer.presence),
    onLeave: (peer) => removeAvatar(peer.id),
  },
});

await sf.start();

// In your render loop
sf.setPresence({ pos: [camera.position.x, camera.position.y, camera.position.z] });
```

## API

- **`starfishThree(options)`** / **`new StarfishThree(options)`** — create an adapter instance
- **`start()` / `stop()`** — connect/disconnect
- **`setPresence(data)`** — broadcast your state (throttled)
- **`peers`** / **`eachPeer(fn)`** — read other clients' presence
- **`on(topic, cb)` / `emit(topic, payload)`** — pub/sub messaging
- **`stream(topic, payload)`** — unreliable RTC delivery (ideal for high-frequency pose data)
- **`setShared(key, data)` / `getShared(key)` / `onShared(key, cb)`** — shared session data
- **`sendTo(peerId, payload)` / `broadcast(payload)`** — direct and broadcast messaging
- **`PeerManager`** — standalone peer lifecycle tracker with `onJoin`/`onUpdate`/`onLeave` callbacks

## License

MIT
