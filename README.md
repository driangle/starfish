# Starfish

A transport-neutral realtime protocol for creative coding -- networked performance, multiplayer sketches, installations, live visuals, and distributed browser-based artworks.

Starfish provides sessions, presence, topic pub/sub, direct and broadcast messaging, shared data operations, and event streams over WebSocket with optional WebRTC peer-to-peer data channels.

## Project Structure

| Directory | Description |
|-----------|-------------|
| [protocol/](protocol/) | Protocol specification and message schema |
| [sdks/](sdks/) | Client libraries (TypeScript, Python, Go) |
| [servers/](servers/) | Server implementations (TypeScript, Go) |
| [adapters/](adapters/) | Framework integrations (p5.js, Three.js, TouchDesigner) |
| [examples/](examples/) | Demo applications for each SDK and adapter |
| [tests/](tests/) | Integration test suite |
| [scripts/](scripts/) | Build and CI utility scripts |
| [docs/](docs/) | VitePress documentation site |

## Quick Start

Start a server, then run an example against it.

### 1. Start the Go server

```bash
cd servers/golang
go run .
# Listening on ws://localhost:8080/starfish
```

### 2. Run an example

**TypeScript:**

```bash
cd sdks/typescript && npm install && npm run build && cd ../..
cd examples/typescript && npm install && npm run build
npm run connection
```

**Python:**

```bash
cd sdks/python && pip install -e .
cd examples/python && python connection.py
```

## Development

```bash
make help             # Show all available targets
make check            # Lint, type-check, and unit-test everything
make check-lite       # Lint and type-check only (no tests)
make test-integration # Run protocol + SDK integration tests
make format           # Auto-format all code
make install-hooks    # Install the pre-commit hook
```

## Protocol

See the [protocol specification](protocol/spec/starfish-v0.1.md) for the full message format, transport model, and session lifecycle.
