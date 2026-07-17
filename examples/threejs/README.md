# Starfish Three.js Examples

Example scenes demonstrating real-time collaboration in Three.js using the Starfish adapter.

## Prerequisites

- A running Starfish server on `ws://localhost:8080`
- Node.js installed

## Setup

```bash
# From the repo root, build the SDK and adapter
cd sdks/typescript && npm install && npm run build && cd ../..
cd adapters/threejs && npm install && npm run build && cd ../..

# Install example dependencies
cd examples/threejs && npm install

# Serve the examples
npm run serve
```

Then open the example URLs in multiple browser tabs to see collaboration in action.

## Examples

### 3D Avatar Sync (`avatars/`)

Each connected user controls a colored avatar with WASD keys and mouse drag. All other users' avatars appear in real-time, smoothly interpolating to their latest position.

**Controls:** WASD/arrows = move, mouse drag = rotate

**Adapter features demonstrated:**
- `starfishThree({ peers: { onJoin, onLeave } })` — peer lifecycle callbacks for scene graph management
- `sf.start()` / `sf.setPresence()` — connection and presence lifecycle
- `sf.eachPeer()` — iterating peers with their presence data for smooth interpolation
- `sf.peers` / `sf.connected` — reading the peer list and connection status

### Shared 3D Scene (`shared-scene/`)

All users place and manipulate 3D objects on a shared ground plane. Click to add random primitives, drag to move them, Delete to remove. Peer cursor positions appear as rings on the ground.

**Controls:** Click ground = place object, click + drag = move, Delete/Backspace = remove

**Adapter features demonstrated:**
- `sf.on(topic, cb)` / `sf.emit(topic, payload)` — subscribing and publishing object events
- `sf.stream(topic, payload)` — unreliable fast delivery for drag updates
- `sf.setShared(key, data)` / `sf.onShared(key, cb)` — persisting scene state for late joiners
- `sf.setPresence()` / `sf.eachPeer()` — showing peer cursor positions

### Pool Matchmaking (`pool-matchmaking/`)

The user opens the page and is automatically paired with exactly one other user via pool auto mode. Once matched, both users see each other's cursor as a ring on a shared 3D ground plane. No manual session input required — matchmaking is automatic.

**Adapter features demonstrated:**
- `sf.joinPool(pool, options, onMatch)` — entering a pool and reacting to matches
- `sf.client.join(session)` — joining the matched session for presence exchange
- `sf.setPresence()` / `sf.eachPeer()` — showing peer cursor positions after match
- `sf.peers` / `sf.connected` — reading the peer list and connection status

### Collaborative Scene Editor (`scene-editor/`)

A pre-populated 3D scene where any peer can select objects and edit their properties (color, scale, rotation). Each object's state is stored as a separate shared data key, enabling fine-grained collaborative editing. Peer selections are highlighted with colored outlines.

**Controls:** Click = select, C = change color, +/- = scale, R = rotate 45°

**Adapter features demonstrated:**
- `sf.setShared("obj:<id>", props)` / `sf.onShared()` — per-object property sync via shared data keys
- `sf.getShared(key)` — reading cached shared data for late-joiner initialization
- `sf.setPresence({ selectedId })` — broadcasting selection state
- `sf.eachPeer()` — rendering colored outlines for peer selections
