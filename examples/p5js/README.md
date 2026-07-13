# Starfish p5.js Examples

Example sketches demonstrating real-time collaboration in p5.js using the Starfish adapter.

## Prerequisites

- A running Starfish server on `ws://localhost:8080`
- Node.js installed

## Setup

```bash
# From the repo root, build the SDK and adapter
cd sdks/typescript && npm install && npm run build && cd ../..
cd adapters/p5js && npm install && npm run build && cd ../..

# Install example dependencies
cd examples/p5js && npm install

# Serve the examples
npm run serve
```

Then open the example URLs in multiple browser tabs to see collaboration in action.

## Examples

### Multiplayer Cursors (`cursors/`)

Every connected user sees all other users' cursors moving in real-time.

**Adapter features demonstrated:**
- `sf.start()` / `sf.setPresence()` — connection and presence lifecycle
- `sf.eachPeer()` — iterating peers with their presence data
- `sf.peers` — reading the connected peer list

### Shared Canvas (`shared-canvas/`)

All users draw on the same canvas collaboratively. Press any key to change the background color for everyone.

**Adapter features demonstrated:**
- `sf.on(topic, cb)` — subscribing to topic messages
- `sf.emit(topic, payload)` — publishing stroke data
- `sf.setShared(key, data)` — setting session-wide shared data
- `sf.onShared(key, cb)` — reacting to shared data changes

### Collaborative Generative Art (`generative-art/`)

All peers see the same evolving generative pattern. Any peer can tweak the parameters (speed, hue, shape count) and the changes sync to everyone.

**Controls:** UP/DOWN = speed, LEFT/RIGHT = hue, +/- = shapes

**Adapter features demonstrated:**
- `sf.setShared()` / `sf.onShared()` — syncing generative parameters
- `sf.setPresence()` / `sf.eachPeer()` — showing peer cursors overlaid on the artwork
- Shared state driving a render loop

### Instance Mode (`instance-mode/`)

Two p5.js sketches on the same page, each with their own Starfish connection to the same session. Demonstrates how to use the adapter in p5.js instance mode.

**Adapter features demonstrated:**
- `p5` option — passing the p5 instance for cleanup hooks
- Multiple independent adapter instances on one page
- Instance mode vs global mode usage pattern
