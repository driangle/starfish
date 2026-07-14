# SDKs

Client libraries for connecting to a Starfish server. Each SDK implements the full protocol with a consistent API across languages.

| SDK | Language | Status |
|-----|----------|--------|
| [typescript/](typescript/) | TypeScript / JavaScript | Implemented |
| [python/](python/) | Python 3.10+ | Implemented |
| [golang/](golang/) | Go | Planned |

## Features

All implemented SDKs support:

- WebSocket connection and session management
- Presence tracking
- Topic pub/sub messaging
- Direct and broadcast messaging
- Shared data operations (replace, merge, counters)
- Clock synchronization
- Automatic reconnection

See [examples/](../examples/) for working demos of each SDK feature.
