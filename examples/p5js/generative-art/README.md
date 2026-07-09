# Collaborative Generative Art

All peers see the same evolving generative pattern. Any peer can tweak parameters (speed, hue, shape count) and the changes sync to everyone instantly. Demonstrates shared data driving a render loop.

## Controls

| Key | Action |
|-----|--------|
| UP / DOWN | Change rotation speed |
| LEFT / RIGHT | Shift base hue |
| + / - | Add / remove shapes |

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

Open `http://localhost:3000/generative-art/` in two or more browser tabs. Use the keyboard controls in any tab -- all tabs will update in sync.

## Adapter API used

- `sf.setShared(key, data)` -- sync generative parameters to all peers
- `sf.onShared(key, cb)` -- receive parameter changes from any peer
- `sf.eachPeer(fn)` -- overlay peer cursors on the artwork
