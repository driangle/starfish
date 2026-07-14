# Adapters

Framework-specific integrations that wrap a Starfish SDK and expose an idiomatic API for each creative coding environment.

| Adapter | Framework | Built on |
|---------|-----------|----------|
| [p5js/](p5js/) | [p5.js](https://p5js.org/) | TypeScript SDK |
| [threejs/](threejs/) | [Three.js](https://threejs.org/) | TypeScript SDK |
| [touchdesigner/](touchdesigner/) | [TouchDesigner](https://derivative.ca/) | Python SDK |

Each adapter handles connection lifecycle, presence, pub/sub, and shared data through a simplified API designed for its framework. See the [examples/](../examples/) directory for working demos using each adapter.
