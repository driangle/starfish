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
| `sendRTC(peerId, channel, payload)` | `void` | Send via RTC data channel |
| `rtcPeers$` | `Observable<RTCPeerInfo[]> \| null` | RTC peer connection states |

### Events

| Method | Returns | Description |
|--------|---------|-------------|
| `events$(filter?)` | `EventStream<StarfishFrame>` | Filtered event stream |
| `on(callback)` | `Unsubscribe` | Listen to all frames |

### Clock

| Method | Returns | Description |
|--------|---------|-------------|
| `clock.sync(samples?)` | `Promise<number>` | Sync with server clock |
| `clock.now()` | `number` | Current server-adjusted time |
| `clock.offset` | `number` | Clock offset in ms |
| `at(serverTime, callback)` | `Timeout` | Schedule callback at server time |

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

The protocol message unit. See [Core Concepts](./core-concepts#frames) for the full structure.

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
  code: string;      // e.g. "NO_SESSION", "NOT_CONNECTED"
  message: string;
  details?: unknown;
}
```

See [Troubleshooting](./troubleshooting) for a list of all error codes.
