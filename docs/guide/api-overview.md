# API Overview

## StarfishClient Methods

### Connection

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `Promise<void>` | Connect to the server |
| `disconnect()` | `Promise<void>` | Disconnect and clean up |
| `connection$` | `Observable<ConnectionState>` | Connection state changes |
| `clientId` | `string \| null` | Your assigned client ID |

### Sessions

| Method | Returns | Description |
|--------|---------|-------------|
| `join(session, options?)` | `Promise<StarfishFrame>` | Join a session |
| `leave()` | `Promise<void>` | Leave the current session |
| `clients$` | `Observable<ClientInfo[]>` | All clients in the session |
| `peers$` | `Observable<ClientInfo[]>` | All clients except yourself |

### Topics

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribe(topic, callback?)` | `Promise<StarfishFrame>` | Subscribe to a topic |
| `unsubscribe(topic)` | `Promise<void>` | Unsubscribe from a topic |
| `publish(topic, payload, options?)` | `void` | Publish to a topic |
| `topic$(topic)` | `EventStream<StarfishFrame>` | Stream of messages for a topic |

### Messaging

| Method | Returns | Description |
|--------|---------|-------------|
| `send(to, payload, options?)` | `void` | Send to specific client(s) |
| `broadcast(payload, options?)` | `void` | Send to all clients in the session |
| `messages$` | `EventStream<StarfishFrame>` | All incoming direct messages |
| `messagesFrom$(peerId)` | `EventStream<StarfishFrame>` | Messages from a specific peer |

### Presence

| Method | Returns | Description |
|--------|---------|-------------|
| `presence.set(payload)` | `void` | Set your presence data |
| `presence$` | `Observable<Map<string, any>>` | All clients' presence data |

### Data

| Method | Returns | Description |
|--------|---------|-------------|
| `save(options)` | `Promise<DataResult>` | Write data with an operation |
| `get({ key, scope })` | `Promise<DataResult>` | Read data |
| `changed$` | `EventStream<DataResult>` | All data change events |
| `key$(key)` | `EventStream<DataResult>` | Changes for a specific key |

### WebRTC

| Method | Returns | Description |
|--------|---------|-------------|
| `connectRTC(peerId, channels?)` | `Promise<void>` | Open RTC connection to a peer |
| `disconnectRTC(peerId)` | `void` | Close RTC connection |
| `rtcPeers$` | `Observable<RTCPeerInfo[]> \| null` | RTC peer connection states |

### Events

| Method | Returns | Description |
|--------|---------|-------------|
| `events$(filter?)` | `EventStream<StarfishFrame>` | Filtered event stream (filter by `resource`, `method`, `topic`, `from`) |
| `on(callback)` | `Unsubscribe` | Listen to all frames |

### Clock

| Method | Returns | Description |
|--------|---------|-------------|
| `clock.sync(samples?)` | `Promise<number>` | Sync with server clock |
| `clock.now()` | `number` | Current server-adjusted time |
| `clock.offset` | `number` | Clock offset in ms |
| `clock.at(serverTime, callback)` | `Timeout` | Schedule callback at server time |

### Pools

Server-managed matchmaking: enter a pool and the server groups you with other waiting
clients into a shared session. TypeScript exposes these through `client.pool`; Python
exposes them directly on the client. See the [Pool reference](../reference/pool) for the
full API.

| TypeScript | Python | Returns | Description |
|-----------|--------|---------|-------------|
| `pool.enter(name, options)` | `pool_enter(options)` | `Promise<StarfishFrame>` / `PoolEnteredResult` | Enter a pool |
| `pool.leave(name)` | `pool_leave(pool)` | `void` / `None` | Leave a pool |
| `pool.claim(name, targetId)` | `pool_claim(pool, target)` | `void` / `None` | Claim a specific member (claim/mutual modes) |
| `pool.accept(name, fromId)` | `pool_accept(pool, from_)` | `void` / `None` | Accept a proposal (propose mode) |
| `pool.reject(name, fromId)` | `pool_reject(pool, from_)` | `void` / `None` | Reject a proposal (propose mode) |
| `pool.assign(name, groups)` | `pool_assign(pool, groups)` | `Promise<StarfishFrame>` / `StarfishFrame` | Assign groups (delegated mode, matchmaker role) |
| `pool.matched$` | `pool_matched` | `EventStream<PoolMatchedEvent>` / `EventStream[PoolMatchResult]` | Emitted when the server matches you into a session |
| `pool.members$` | `pool_members(pool)` | `Observable<PoolMember[]>` | Current members of the pool |
| `pool.proposal$` | — | `EventStream<...>` | Incoming pairing proposals (TypeScript only) |
| `pool.claimRejected$` | — | `EventStream<...>` | Emitted when a claim you made is rejected (TypeScript only) |

Pool `mode` is one of `"auto"` (server pairs by group size), `"claim"`, `"mutual"`,
`"propose"`, or `"delegated"`. Pass `create: true` to open the pool if it does not
exist yet.

## Language-Specific API Differences

The SDKs share the same concepts but adapt to each language's conventions:

| Concept | TypeScript | Python | Swift |
|---------|-----------|--------|-------|
| Async | `Promise` / `async/await` | `asyncio` coroutines | `async/await` with structured concurrency |
| Reactive streams | `Observable<T>` / `EventStream<T>` | `Observable[T]` / `EventStream[T]` | `AsyncStream<T>` |
| Subscribe callback | `.subscribe(cb)` | `.subscribe(cb)` | `for await ... in stream` or `.subscribe(cb)` |
| Unsubscribe | Call returned function | Call returned function | Call returned closure |
| Errors | `StarfishError` thrown | `StarfishError` raised | `StarfishError` thrown |
| Topic stream | `topic$(name)` | `topic_stream(name)` | `topicStream(name)` |
| Data key stream | `key$(name)` | `data_key_stream(name)` | `keyStream(name)` |
| Presence observable | `presence$` | `presence` | `presenceStream` |
| Connection observable | `connection$` | `connection_state` | `connectionState` |

## Observable vs EventStream

The SDK uses two reactive primitives:

**Observable&lt;T&gt;** holds a current value and emits when it changes. Use `.value` to read the current state synchronously.

::: code-group

```ts [TypeScript]
// Read current value
const state = client.connection$.value;

// React to changes
const unsub = client.connection$.subscribe((state) => {
  console.log(state);
});

// Stop listening
unsub();
```

```python [Python]
state = client.connection_state.value

unsub = client.connection_state.subscribe(
    lambda state: print(state)
)

unsub()
```

```swift [Swift]
// As AsyncStream
for await state in client.connectionState {
    print(state)
}

// Or callback-based
let unsub = client.connection$.subscribe { state in
    print(state)
}
unsub()
```

:::

**EventStream&lt;T&gt;** emits discrete events with no "current value." Subscribe to receive events as they occur.

::: code-group

```ts [TypeScript]
const unsub = client.changed$.subscribe((result) => {
  console.log("Data changed:", result.key, result.data);
});
```

```python [Python]
unsub = client.data_changed.subscribe(
    lambda result: print("Data changed:", result.key, result.data)
)
```

```swift [Swift]
for await result in client.dataChanges {
    print("Data changed:", result.key, result.data)
}
```

:::

## Key Types

### StarfishFrame

The protocol message unit — an envelope with `header` and `payload`:

```ts
interface StarfishFrame {
  header: StarfishHeader;
  payload?: Record<string, unknown>;
}

interface StarfishHeader {
  v?: 2;
  id: string;
  resource: string;
  method: string;
  kind: "request" | "response" | "event";
  ts?: number;
  session?: string;
  from?: string;
  to?: string | string[];
  topic?: string;
  replyTo?: string;
  delivery?: DeliveryOptions;
  priority?: "low" | "normal" | "high" | "critical";
  ttl?: number;
  meta?: Record<string, unknown>;
}
```

See [Core Concepts](./core-concepts#frames) for details on `kind` semantics and `header.meta` extensibility.

### ClientInfo

```ts
interface ClientInfo {
  id: string;
  name?: string;
  role?: string;
  meta?: Record<string, unknown>;
}
```

### DataResult

```ts
interface DataResult {
  key: string;
  scope: "self" | "session";
  data: unknown;
  version: number;
}
```

### StarfishError

```ts
class StarfishError extends Error {
  code: string;       // e.g. "NO_SESSION", "NOT_CONNECTED"
  message: string;
  resource?: string;  // the resource that produced the error
  retry?: boolean;    // whether the client should retry
  details?: unknown;
}
```

### Pool Types

```ts
interface PoolEnterOptions {
  groupSize: number;
  mode?: "auto" | "claim" | "mutual" | "propose" | "delegated"; // default "auto"
  role?: "member" | "matchmaker";                               // default "member"
  attributes?: Record<string, unknown>;
  filter?: Record<string, string>;
  create?: boolean;
}

interface PoolMember {
  id: string;
  attributes?: Record<string, unknown>;
}

interface PoolMatchedEvent {
  pool: string;
  session: string;
  peers: PoolMember[];
}
```

In Python these correspond to the `PoolEnterOptions`, `PoolMember`, and
`PoolMatchResult` dataclasses. See the [Pool reference](../reference/pool#types) for the
Python field definitions.

See [Troubleshooting](./troubleshooting) for a list of all error codes.
