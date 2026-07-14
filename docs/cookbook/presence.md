# Join a Session and Track Who's Online

## Problem

You need to know which clients are connected to a session and display their identity (name, role, or custom metadata) in real time.

## Solution

Join a session with identity metadata and subscribe to the `clients` or `peers` observable to track who is online. Use `presence` to share ephemeral state like cursor position or status.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();

await client.join("room-42", {
  name: "Alice",
  role: "editor",
  meta: { color: "#ff6b6b" },
});

// Track all connected clients (including self)
client.clients$.subscribe((clients) => {
  console.log("Online:", clients.map((c) => c.name));
});

// Track peers only (excludes self)
client.peers$.subscribe((peers) => {
  console.log("Peers:", peers.map((p) => p.name));
});

// Share your presence (e.g., cursor position)
client.presence.set({ cursor: { x: 100, y: 200 } });

// Watch all presence updates
client.presence$.subscribe((presenceMap) => {
  for (const [clientId, data] of presenceMap) {
    console.log(`${clientId} →`, data);
  }
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, JoinOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()

await client.join("room-42", JoinOptions(
    name="Alice",
    role="editor",
    meta={"color": "#ff6b6b"},
))

# Track all connected clients (including self)
client.clients.subscribe(
    lambda clients: print("Online:", [c.name for c in clients])
)

# Track peers only (excludes self)
client.peers.subscribe(
    lambda peers: print("Peers:", [p.name for p in peers])
)

# Share your presence (e.g., cursor position)
client.presence_set({"cursor": {"x": 100, "y": 200}})

# Watch all presence updates
client.presence.subscribe(
    lambda presence_map: [
        print(f"{cid} →", data)
        for cid, data in presence_map.items()
    ]
)
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()

try await client.join(session: "room-42", options: JoinOptions(
    name: "Alice",
    role: "editor",
    meta: ["color": AnyCodable("#ff6b6b")]
))

// Track all connected clients (including self)
Task {
    for await clients in client.clients {
        print("Online:", clients.map { $0.name ?? "?" })
    }
}

// Track peers only (excludes self)
Task {
    for await peers in client.peers {
        print("Peers:", peers.map { $0.name ?? "?" })
    }
}

// Share your presence (e.g., cursor position)
try client.presence.set(AnyCodable(["cursor": ["x": 100, "y": 200]]))

// Watch all presence updates
Task {
    for await presenceMap in client.presenceStream {
        for (clientId, data) in presenceMap {
            print("\(clientId) →", data)
        }
    }
}
```

:::

## Explanation

- **`join(session, options)`** — connects to (or creates) a named session. The optional identity fields (`name`, `role`, `meta`) are visible to other clients.
- **`clients$` / `clients`** — an observable/stream of all connected clients, including yourself. Updates whenever someone joins or leaves.
- **`peers$` / `peers`** — same as clients but excludes the local client. Useful for rendering "other users" lists.
- **`presence.set(payload)`** — sets your ephemeral presence data (max 8 KB). Other clients see this via the presence observable.
- **`presence$` / `presenceStream`** — a map from client IDs to their presence data. Updates in real time as peers change their presence.

Presence data is ephemeral — it is not persisted and disappears when a client disconnects. Use [shared state](./shared-state) if you need persistence.

## Variations

### Minimal join (no identity)

::: code-group

```typescript [TypeScript]
await client.join("my-session");
```

```python [Python]
await client.join("my-session")
```

```swift [Swift]
try await client.join(session: "my-session")
```

:::

### Join without creating the session

Pass `create: false` to only join existing sessions — useful when the session must be created by a specific "host" client:

::: code-group

```typescript [TypeScript]
await client.join("host-session", { create: false });
```

```python [Python]
await client.join("host-session", JoinOptions(create=False))
```

```swift [Swift]
try await client.join(session: "host-session", options: JoinOptions(create: false))
```

:::
