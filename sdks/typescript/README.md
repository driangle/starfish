# Starfish TypeScript SDK

TypeScript client library for the Starfish realtime protocol.

## Installation

```bash
npm install @driangle/starfish-client
```

## Quick Start

```typescript
import { StarfishClient } from "@driangle/starfish-client";

const client = new StarfishClient({ url: "ws://localhost:4040" });
await client.connect();
await client.join("my-session");

// Subscribe to a topic
client.subscribe("chat", (frame) => console.log(frame));

// Publish a message
await client.publish("chat", { text: "Hello!" });
```

## License

MIT
