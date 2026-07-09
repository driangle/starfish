# Instance Mode

Two p5.js sketches on the same page, each with their own Starfish connection to the same session. Demonstrates how to use the adapter with p5.js instance mode instead of global mode.

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

### 4. Open in browser

Open `http://localhost:3000/instance-mode/`. Two canvases appear side by side, each connected to the same session as a separate peer. Move your mouse over each canvas to see the other canvas reflect your cursor.

## Adapter API used

- `starfishP5({ url, session, p5 })` — pass the p5 instance for correct mouse tracking
- Multiple independent adapter instances on one page
- Instance mode pattern: `new p5((p) => { ... })` with `p5: p` option
