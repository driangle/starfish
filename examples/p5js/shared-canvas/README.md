# Shared Canvas

All users draw on the same canvas collaboratively. Press any key to change the background color for everyone. Demonstrates topic pub/sub and shared data.

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

Open `http://localhost:3000/shared-canvas/` in two or more browser tabs. Drag to draw — strokes appear on all connected canvases. Press any key to randomize the background color for everyone.

## Adapter API used

- `sf.on(topic, cb)` — subscribe to topic messages (receives stroke data)
- `sf.emit(topic, payload)` — publish stroke data to all peers
- `sf.setShared(key, data)` — set session-wide shared data (background color)
- `sf.onShared(key, cb)` — react to shared data changes
