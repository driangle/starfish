# Multiplayer Cursors

Every connected user sees all other users' cursors moving in real-time. Demonstrates presence tracking, peer rendering, and auto-cursor sync.

## Running

### 1. Start a Starfish server

The examples expect a server at `ws://localhost:8080`. Pick any server implementation:

- [TypeScript server](../../../servers/typescript/README.md)
- [Go server](../../../servers/golang/README.md)
- [Python server](../../../servers/python/README.md)

### 2. Build the SDK and adapter

```bash
cd sdks/typescript && npm install && npm run build && cd ../..
cd adapters/p5js && npm install && npm run build && cd ../..
```

### 3. Serve the examples

```bash
cd examples/p5js
npm install
npm run serve
```

### 4. Open in multiple tabs

Open `http://localhost:3000/cursors/` in two or more browser tabs. Move your mouse in each tab to see cursors sync across all connected peers.

## Adapter API used

- `starfishP5({ url, session, name, meta })` — create adapter
- `sf.start()` — connect and join session
- `sf.update()` — send cursor position (call in `draw()`)
- `sf.eachPeer(fn)` — iterate peers with their position
- `sf.peers` — read connected peer list
- `sf.connected` — check connection status
