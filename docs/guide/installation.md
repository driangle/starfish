# Installation

## TypeScript

::: code-group

```sh [npm]
npm install @starfish/client
```

```sh [yarn]
yarn add @starfish/client
```

```sh [pnpm]
pnpm add @starfish/client
```

:::

The SDK has **zero runtime dependencies** and ships with TypeScript declarations. The minimum supported TypeScript version is 5.0. The package is distributed as ESM only.

### Browser

No additional setup needed — browsers provide a native `WebSocket`.

```ts
import { StarfishClient } from "@starfish/client";

const client = new StarfishClient({
  server: "ws://localhost:4000",
});
```

### Node.js

Node.js does not include a built-in WebSocket. Install the `ws` package and pass it as a factory:

```sh
npm install ws
npm install -D @types/ws  # for TypeScript
```

```ts
import { StarfishClient } from "@starfish/client";
import WebSocket from "ws";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  ws: (url) => new WebSocket(url),
});
```

## Python

```sh
pip install starfish
```

The Python SDK uses `websockets` for its WebSocket connection. It requires Python 3.10+ and uses `asyncio` for all async operations.

```python
from starfish import StarfishClient, StarfishClientOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
```

## Swift

Add the package to your `Package.swift` dependencies:

```swift
dependencies: [
    .package(url: "https://github.com/driangle/starfish.git", from: "0.0.1")
]
```

Then add `StarfishClient` to your target's dependencies:

```swift
.target(
    name: "MyApp",
    dependencies: [
        .product(name: "StarfishClient", package: "starfish")
    ]
)
```

The Swift SDK uses `URLSession` WebSocket support and requires Swift 5.9+ with structured concurrency.

```swift
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
```
