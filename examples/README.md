# Examples

Demo applications showcasing Starfish features across SDKs and adapters.

| Directory | Description |
|-----------|-------------|
| [typescript/](typescript/) | Node.js scripts demonstrating each TypeScript SDK feature |
| [python/](python/) | Python scripts demonstrating each Python SDK feature |
| [p5js/](p5js/) | p5.js sketches using the Starfish p5 adapter |
| [threejs/](threejs/) | Three.js scenes using the Starfish Three.js adapter |

## Prerequisites

All examples require a running Starfish server at `ws://localhost:8080/starfish`. See [servers/](../servers/) for setup instructions.

## SDK Examples

The TypeScript and Python example sets each demonstrate the same five features:

- **Connection** -- session join/leave and connection state
- **Pub/Sub** -- topic subscription and publishing
- **Presence** -- setting and observing peer presence data
- **Shared Data** -- collaborative state with replace, merge, and counter operations
- **Clock Sync** -- synchronized timing across clients

## Adapter Examples

The p5.js and Three.js examples demonstrate real-time collaboration in the browser -- multiplayer cursors, shared canvases, 3D avatar sync, collaborative scene editing, and more. Open multiple browser tabs to see collaboration in action.

See each subdirectory's README for setup and usage details.
