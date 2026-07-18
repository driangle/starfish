# Migration Guide: v1 to v2

This guide covers the breaking changes between Starfish Protocol v1 and v2. All SDKs (TypeScript, Python, Swift) have been updated to v2.

## Frame Structure

The flat frame structure has been replaced with a header/payload envelope:

::: code-group

```json [v1 (old)]
{
  "v": 1,
  "id": "pub_42",
  "type": "topic.publish",
  "session": "my-session",
  "topic": "cursor",
  "payload": { "x": 100, "y": 200 },
  "options": {
    "delivery": { "reliability": "unreliable" },
    "priority": "high",
    "ttl": 5000
  }
}
```

```json [v2 (new)]
{
  "header": {
    "id": "pub_42",
    "resource": "topic",
    "method": "publish",
    "kind": "event",
    "session": "my-session",
    "topic": "cursor",
    "delivery": { "reliability": "unreliable" },
    "priority": "high",
    "ttl": 5000
  },
  "payload": { "x": 100, "y": 200 }
}
```

:::

**Key changes:**
- All metadata is now in `header`, application data in `payload`
- `type` is replaced by `resource`, `method`, and `kind`
- `options` is removed — `delivery`, `priority`, `ttl`, and `meta` are header-level fields
- `v` is `2` and optional after handshake

## Type → Resource/Method/Kind

The single `type` field (e.g. `"topic.publish"`) is now three fields:

| v1 `type` | v2 `resource` | v2 `method` | v2 `kind` |
|-----------|---------------|-------------|-----------|
| `client.hello` | `client` | `hello` | `request` |
| `server.welcome` | `client` | `welcome` | `response` |
| `client.connected` | `client` | `connected` | `event` |
| `client.disconnected` | `client` | `disconnected` | `event` |
| `session.join` | `session` | `join` | `request` |
| `session.leave` | `session` | `leave` | `request` |
| `session.broadcast` | `session` | `broadcast` | `event` |
| `topic.subscribe` | `topic` | `subscribe` | `request` |
| `topic.unsubscribe` | `topic` | `unsubscribe` | `request` |
| `topic.publish` | `topic` | `publish` | `event` |
| `topic.message` | `topic` | `message` | `event` |
| `topic.peers` | `topic` | `peers` | `response` |
| `client.send` | `message` | `send` | `request` |
| `presence.set` | `presence` | `set` | `event` |
| `presence.updated` | `presence` | `updated` | `event` |
| `data.save` | `data` | `save` | `request` |
| `data.get` | `data` | `get` | `request` |
| `data.changed` | `data` | `changed` | `event` |
| `clock.sync` | `clock` | `sync` | `request` |

### Kind Semantics

- **`request`** — expects a `response` (matched via `replyTo`)
- **`response`** — reply to a prior request
- **`event`** — fire-and-forget notification

## Options Restructuring

The `options` wrapper has been removed. Its fields are now directly on the header:

```diff
- "options": {
-   "delivery": { "reliability": "unreliable" },
-   "priority": "high",
-   "ttl": 5000,
-   "requireAck": true
- }
+ "delivery": { "reliability": "unreliable", "requireAck": true },
+ "priority": "high",
+ "ttl": 5000
```

Note: `requireAck` moved into `delivery`.

## SDK Changes

### FrameOptions → HeaderOptions

The options type passed to `publish`, `send`, and `broadcast` has been renamed:

::: code-group

```ts [TypeScript]
// v1
import { FrameOptions } from "@starfish/client";
client.publish("topic", data, { delivery: { ... } } as FrameOptions);

// v2
import { HeaderOptions } from "@starfish/client";
client.publish("topic", data, { delivery: { ... } } as HeaderOptions);
```

```python [Python]
# v1
from starfish import FrameOptions
await client.publish("topic", data, FrameOptions(delivery=...))

# v2
from starfish import HeaderOptions
await client.publish("topic", data, HeaderOptions(delivery=...))
```

```swift [Swift]
// v1
try client.publish(topic: "t", payload: data, options: FrameOptions(...))

// v2
try client.publish(topic: "t", payload: data, options: HeaderOptions(...))
```

:::

### Frame Property Access

Frame properties that were top-level are now under `header`:

```ts
// v1
frame.from
frame.type
frame.topic

// v2
frame.header.from
frame.header.resource  // replaces frame.type
frame.header.method
frame.header.topic
```

### EventFilter

`EventFilter` no longer has a `type` field. Use `resource` and `method` instead:

::: code-group

```ts [TypeScript]
// v1
client.events$({ type: "topic.message", topic: "cursor" })

// v2
client.events$({ resource: "topic", method: "message", topic: "cursor" })
```

```python [Python]
# v1
client.events(EventFilter(type="topic.message", topic="cursor"))

# v2
client.events(EventFilter(resource="topic", method="message", topic="cursor"))
```

```swift [Swift]
// v1
client.events(filter: EventFilter(type: "topic.message", topic: "cursor"))

// v2
client.events(filter: EventFilter(resource: "topic", method: "message", topic: "cursor"))
```

:::

### StarfishError

`StarfishError` now includes `resource` and `retry` fields:

```ts
try {
  await client.join("room");
} catch (err) {
  if (err instanceof StarfishError) {
    console.log(err.code);      // "session.not_found"
    console.log(err.resource);  // "session" (NEW)
    console.log(err.retry);     // false (NEW)
  }
}
```

## Version Negotiation

The handshake now includes version negotiation. The client sends supported versions in `hello`, and the server selects the highest mutually supported version in `welcome`. See [Architecture](./architecture#version-negotiation) for details.

## New: header.meta

A new `meta` field on the header allows attaching arbitrary application metadata to any frame without conflicting with protocol fields:

```ts
client.publish("updates", { text: "hello" }, {
  meta: { batchId: "batch_42", source: "sensor-3" },
});
```

See [Core Concepts](./core-concepts#header-meta-extensibility) for details.
