# Store and Sync Shared State

## Problem

You need persistent, shared state that survives reconnections — a score counter, a list of items, or a collaborative document — and multiple clients may update it concurrently.

## Solution

Use `save()` with `DataOp` operations to read and write shared state. Starfish supports replace, merge, counter, set, and list operations with optimistic concurrency control via versioning.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("my-session");

// Replace: set an entire value
await client.save({
  key: "settings",
  scope: "session",
  op: "replace",
  data: { theme: "dark", volume: 80 },
});

// Merge: deep-merge into existing value
await client.save({
  key: "settings",
  scope: "session",
  op: "merge",
  data: { volume: 50 },  // only updates volume, keeps theme
});

// Counter: increment a numeric value
await client.save({
  key: "score",
  scope: "session",
  op: "counter.add",
  data: 10,
});

// Set: add/remove from a set (no duplicates)
await client.save({
  key: "tags",
  scope: "session",
  op: "set.add",
  data: ["urgent", "reviewed"],
});

// List: append to an ordered list
await client.save({
  key: "history",
  scope: "session",
  op: "list.add",
  data: [{ action: "moved", x: 10, y: 20 }],
});

// Read current value
const result = await client.get({ key: "settings", scope: "session" });
console.log(result.data, "version:", result.version);

// Watch for changes
client.key$("settings").subscribe((result) => {
  console.log("Settings changed:", result.data);
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, SaveOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("my-session")

# Replace: set an entire value
await client.save(SaveOptions(
    key="settings",
    scope="session",
    op="replace",
    data={"theme": "dark", "volume": 80},
))

# Merge: deep-merge into existing value
await client.save(SaveOptions(
    key="settings",
    scope="session",
    op="merge",
    data={"volume": 50},  # only updates volume, keeps theme
))

# Counter: increment a numeric value
await client.save(SaveOptions(
    key="score",
    scope="session",
    op="counter.add",
    data=10,
))

# Set: add/remove from a set (no duplicates)
await client.save(SaveOptions(
    key="tags",
    scope="session",
    op="set.add",
    data=["urgent", "reviewed"],
))

# List: append to an ordered list
await client.save(SaveOptions(
    key="history",
    scope="session",
    op="list.add",
    data=[{"action": "moved", "x": 10, "y": 20}],
))

# Read current value
result = await client.get("settings", scope="session")
print(result.data, "version:", result.version)

# Watch for changes
client.data_key_stream("settings").subscribe(
    lambda result: print("Settings changed:", result.data)
)
```

```swift [Swift]
import StarfishClient

let client = StarfishClient(options: StarfishClientOptions(
    server: URL(string: "ws://localhost:4000")!
))
try await client.connect()
try await client.join(session: "my-session")

// Replace: set an entire value
try await client.save(SaveOptions(
    key: "settings",
    scope: .session,
    op: .replace,
    data: AnyCodable(["theme": "dark", "volume": 80])
))

// Merge: deep-merge into existing value
try await client.save(SaveOptions(
    key: "settings",
    scope: .session,
    op: .merge,
    data: AnyCodable(["volume": 50])  // only updates volume, keeps theme
))

// Counter: increment a numeric value
try await client.save(SaveOptions(
    key: "score",
    scope: .session,
    op: .counterAdd,
    data: AnyCodable(10)
))

// Set: add/remove from a set (no duplicates)
try await client.save(SaveOptions(
    key: "tags",
    scope: .session,
    op: .setAdd,
    data: AnyCodable(["urgent", "reviewed"])
))

// List: append to an ordered list
try await client.save(SaveOptions(
    key: "history",
    scope: .session,
    op: .listAdd,
    data: AnyCodable([["action": "moved", "x": 10, "y": 20]])
))

// Read current value
let result = try await client.get(key: "settings", scope: .session)
print(result.data as Any, "version:", result.version)

// Watch for changes
Task {
    for await result in client.keyStream("settings") {
        print("Settings changed:", result.data as Any)
    }
}
```

:::

## Explanation

### Data operations

| Operation | Description | Data type |
|-----------|-------------|-----------|
| `replace` | Overwrites the entire value | Any |
| `merge` | Deep-merges into existing object | Object |
| `counter.add` | Increments a number | Number |
| `set.add` | Adds items to a set (no duplicates) | Array |
| `set.remove` | Removes items from a set | Array |
| `list.add` | Appends items to an ordered list | Array |
| `list.remove` | Removes items from a list | Array |
| `delete` | Deletes the key entirely | None |

### Scopes

- **`"session"`** — shared across all clients in the session. Use for collaborative state.
- **`"self"`** — private to the current client. Use for per-user preferences or draft state.

### Concurrency control

Use `expectedVersion` to prevent lost updates. If the server's version doesn't match, the save is rejected:

::: code-group

```typescript [TypeScript]
const current = await client.get({ key: "score", scope: "session" });

try {
  await client.save({
    key: "score",
    scope: "session",
    op: "counter.add",
    data: 1,
    expectedVersion: current.version,
  });
} catch (err) {
  console.log("Conflict — re-read and retry");
}
```

```python [Python]
from starfish import ConflictError

current = await client.get("score", scope="session")

try:
    await client.save(SaveOptions(
        key="score",
        scope="session",
        op="counter.add",
        data=1,
        expected_version=current.version,
    ))
except ConflictError as err:
    print(f"Conflict at version {err.current_version} — re-read and retry")
```

```swift [Swift]
let current = try await client.get(key: "score", scope: .session)

do {
    try await client.save(SaveOptions(
        key: "score",
        scope: .session,
        op: .counterAdd,
        data: AnyCodable(1),
        expectedVersion: current.version
    ))
} catch {
    print("Conflict — re-read and retry")
}
```

:::

## Variations

### Delete a key

::: code-group

```typescript [TypeScript]
await client.save({ key: "settings", scope: "session", op: "delete" });
```

```python [Python]
await client.save(SaveOptions(key="settings", scope="session", op="delete"))
```

```swift [Swift]
try await client.save(SaveOptions(key: "settings", scope: .session, op: .delete))
```

:::

### Watch all data changes

::: code-group

```typescript [TypeScript]
client.changed$.subscribe((result) => {
  console.log(`Key "${result.key}" changed to:`, result.data);
});
```

```python [Python]
client.data_changed.subscribe(
    lambda result: print(f'Key "{result.key}" changed to:', result.data)
)
```

```swift [Swift]
Task {
    for await result in client.dataChanges {
        print("Key \"\(result.key)\" changed to:", result.data as Any)
    }
}
```

:::
