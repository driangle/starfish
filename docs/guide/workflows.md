# Common Workflows

## Joining and Leaving Sessions

::: code-group

```ts [TypeScript]
// Join with options
const response = await client.join("art-room", {
  name: "Alice",
  role: "performer",
  meta: { instrument: "piano" },
  create: true, // create session if it doesn't exist (default)
});

// The response contains the list of clients already in the session
console.log("Clients in session:", response.payload.clients);

// React to clients joining and leaving
client.clients$.subscribe((clients) => {
  console.log("Current clients:", clients.map((c) => c.name));
});

// Leave when done
await client.leave();
```

```python [Python]
from starfish import JoinOptions

response = await client.join("art-room", JoinOptions(
    name="Alice",
    role="performer",
    meta={"instrument": "piano"},
    create=True,
))

print("Clients in session:", response.payload.get("clients"))

client.clients.subscribe(
    lambda clients: print("Current clients:", [c.name for c in clients])
)

await client.leave()
```

```swift [Swift]
let response = try await client.join(session: "art-room", options: JoinOptions(
    name: "Alice",
    role: "performer",
    meta: ["instrument": "piano"],
    create: true
))

Task {
    for await clients in client.clients {
        print("Current clients:", clients.map { $0.name ?? $0.id })
    }
}

try client.leave()
```

:::

## Pub/Sub with Topics

Topics are the primary way to broadcast messages to interested clients.

::: code-group

```ts [TypeScript]
// Set up listener before subscribing to avoid missing messages
const unsub = client.topic$("drawing").subscribe((frame) => {
  const { x, y, color } = frame.payload;
  drawPoint(x, y, color);
});

// Tell the server you want to receive "drawing" messages
await client.subscribe("drawing");

// Publish drawing events
canvas.addEventListener("pointermove", (e) => {
  client.publish("drawing", {
    x: e.offsetX,
    y: e.offsetY,
    color: currentColor,
  });
});

// Clean up
unsub();
await client.unsubscribe("drawing");
```

```python [Python]
unsub = client.topic_stream("drawing").subscribe(
    lambda frame: draw_point(
        frame.payload["x"],
        frame.payload["y"],
        frame.payload["color"],
    )
)

await client.subscribe("drawing")

# Publish drawing events
await client.publish("drawing", {
    "x": x,
    "y": y,
    "color": current_color,
})

# Clean up
unsub()
await client.unsubscribe("drawing")
```

```swift [Swift]
let drawingTask = Task {
    for await frame in client.topicStream("drawing") {
        let x = frame.payloadInt("x") ?? 0
        let y = frame.payloadInt("y") ?? 0
        drawPoint(x: x, y: y)
    }
}

try await client.subscribe(topic: "drawing")

// Publish drawing events
try client.publish(topic: "drawing", payload: [
    "x": x, "y": y, "color": currentColor
])

// Clean up
drawingTask.cancel()
try client.unsubscribe(topic: "drawing")
```

:::

## Presence Tracking

Presence is ideal for state that updates frequently and where only the latest value matters — cursor positions, active tool selections, typing indicators.

::: code-group

```ts [TypeScript]
// Share your cursor position
document.addEventListener("mousemove", (e) => {
  client.presence.set({
    cursor: { x: e.clientX, y: e.clientY },
    tool: "brush",
  });
});

// Render other clients' cursors
client.presence$.subscribe((presenceMap) => {
  for (const [clientId, data] of presenceMap) {
    if (clientId !== client.clientId) {
      renderCursor(clientId, data.cursor);
    }
  }
});
```

```python [Python]
# Share your cursor position
client.presence_set({
    "cursor": {"x": x, "y": y},
    "tool": "brush",
})

# Render other clients' cursors
client.presence.subscribe(lambda presence: [
    render_cursor(cid, data.get("cursor"))
    for cid, data in presence.items()
    if cid != client.client_id
])
```

```swift [Swift]
// Share your cursor position
try client.presence.set([
    "cursor": ["x": x, "y": y],
    "tool": "brush"
])

// Render other clients' cursors
Task {
    for await presenceMap in client.presenceStream {
        for (clientId, data) in presenceMap {
            if clientId != client.clientId {
                renderCursor(clientId: clientId, data: data)
            }
        }
    }
}
```

:::

## Shared Data

Use shared data for state that needs to persist within the session and support structured updates.

### Counter Pattern

::: code-group

```ts [TypeScript]
// Increment a shared counter
await client.save({
  key: "likes",
  scope: "session",
  op: "counter.add",
  data: 1,
});

// Watch counter changes
client.key$("likes").subscribe((result) => {
  document.getElementById("likes").textContent = result.data;
});
```

```python [Python]
from starfish import SaveOptions

await client.save(SaveOptions(
    key="likes",
    scope="session",
    op="counter.add",
    data=1,
))

client.data_key_stream("likes").subscribe(
    lambda result: print("Likes:", result.data)
)
```

```swift [Swift]
try await client.save(SaveOptions(
    key: "likes",
    scope: .session,
    op: .counterAdd,
    data: 1
))

Task {
    for await result in client.keyStream("likes") {
        print("Likes:", result.data)
    }
}
```

:::

### Set Pattern

```ts
// Add a tag
await client.save({
  key: "tags",
  scope: "session",
  op: "set.add",
  data: ["creative-coding", "music"],
});

// Remove a tag
await client.save({
  key: "tags",
  scope: "session",
  op: "set.remove",
  data: ["music"],
});
```

### List Pattern

```ts
// Append to a log
await client.save({
  key: "chat-history",
  scope: "session",
  op: "list.add",
  data: [{ user: "Alice", text: "Hello!" }],
});
```

### Merge Pattern

```ts
// Partially update an object (shallow merge)
await client.save({
  key: "settings",
  scope: "session",
  op: "merge",
  data: { volume: 0.8 },
});
```

## Direct Messaging

Send messages to specific clients instead of broadcasting to a topic.

::: code-group

```ts [TypeScript]
// Send to one client
client.send(peerId, { type: "offer", data: myOffer });

// Send to multiple clients
client.send([peerId1, peerId2], { type: "sync", data: snapshot });

// Broadcast to everyone in the session
client.broadcast({ type: "announcement", text: "Starting in 10s" });
```

```python [Python]
# Send to one client
await client.send(peer_id, {"type": "offer", "data": my_offer})

# Send to multiple clients
await client.send([peer_id1, peer_id2], {"type": "sync", "data": snapshot})

# Broadcast to everyone in the session
await client.broadcast({"type": "announcement", "text": "Starting in 10s"})
```

```swift [Swift]
// Send to one client
try client.send(to: peerId, payload: ["type": "offer", "data": myOffer])

// Send to multiple clients
try client.send(to: .multiple([peerId1, peerId2]), payload: ["type": "sync"])

// Broadcast to everyone in the session
try client.broadcast(payload: ["type": "announcement", "text": "Starting in 10s"])
```

:::

## Synchronized Timing

Use the clock to coordinate events across clients at the same moment.

::: code-group

```ts [TypeScript]
// Sync clocks first
await client.clock.sync();

// Schedule something 5 seconds from now (in server time)
const targetTime = client.clock.now() + 5000;

// Share the target time with all clients
client.publish("sync", { action: "flash", at: targetTime });

// Each client schedules the action at the same server time
client.topic$("sync").subscribe((frame) => {
  client.at(frame.payload.at, () => {
    triggerFlash();
  });
});
```

```python [Python]
await client.clock.sync()

target_time = client.clock.now() + 5000

await client.publish("sync", {"action": "flash", "at": target_time})

client.topic_stream("sync").subscribe(
    lambda frame: client.at(frame.payload["at"], trigger_flash)
)
```

```swift [Swift]
try await client.clock.sync()

let targetTime = client.clock.now() + 5000

try client.publish(topic: "sync", payload: ["action": "flash", "at": targetTime])

Task {
    for await frame in client.topicStream("sync") {
        if let at = frame.payloadInt("at") {
            client.at(serverTime: at) {
                triggerFlash()
            }
        }
    }
}
```

:::

## High-Frequency Updates with Delivery Options

For data that updates many times per second (cursor positions, sensor readings), use unreliable delivery to reduce latency:

```ts
client.publish("sensor", { value: reading }, {
  delivery: {
    reliability: "unreliable",
    ordering: "unordered",
  },
});
```

Or use `"latest"` delivery when only the most recent value matters — the transport may skip intermediate messages:

```ts
client.publish("slider", { value: 0.75 }, {
  delivery: {
    reliability: "latest",
  },
});
```
