# Servers

Server implementations of the Starfish protocol.

| Server | Language | Status |
|--------|----------|--------|
| [golang/](golang/) | Go | Implemented |
| [typescript/](typescript/) | TypeScript | Implemented |
| [python/](python/) | Python | Not yet implemented |

Both the Go and TypeScript servers implement the full protocol specification, including session management, presence, topic pub/sub, shared data operations, and WebRTC signaling. They are tested against the same [integration test suite](../tests/integration/).

## Quick Start

**Go server:**

```bash
cd golang && go run .
# ws://localhost:8080/starfish
```

**TypeScript server:**

```bash
cd typescript && npm install && npm run build
npm start
```
