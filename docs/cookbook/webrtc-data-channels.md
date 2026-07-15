# Use WebRTC Data Channels

## Problem

You need ultra-low-latency peer-to-peer communication for real-time applications like collaborative drawing, live audio visualization, or multiplayer games where WebSocket round-trips through the server add too much delay.

## Solution

Configure WebRTC options on the TypeScript client and use `connectRTC()` to establish peer-to-peer data channels. Messages sent over RTC bypass the server entirely.

::: info
WebRTC data channels are currently available in the **TypeScript SDK** only. Python and Swift clients can still communicate with WebRTC-enabled clients over WebSocket — messages fall back automatically when the `fallback` option is enabled (default).
:::

## Code

```typescript
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({
  server: "ws://localhost:4000",
  rtc: {
    factory: RTCPeerConnection,  // browser built-in
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
    ],
  },
});

await client.connect();
await client.join("my-session");

// Connect to a peer via WebRTC
const peerId = "client-abc";
await client.connectRTC(peerId, ["control", "stream"]);

// Send via RTC using delivery options
client.send(peerId, { cursor: { x: 100, y: 200 } }, {
  delivery: { reliability: "unreliable" },
});

// Use preferTransport to explicitly route via RTC
client.publish("cursors", { x: 100, y: 200 }, {
  delivery: {
    preferTransport: "rtc",
    reliability: "unreliable",
    fallback: true,  // fall back to WebSocket if RTC unavailable
  },
});

// Monitor RTC peer connections
client.rtcPeers$.subscribe((peers) => {
  for (const peer of peers) {
    console.log(`Peer ${peer.id}: ${peer.state}`);
  }
});

// Disconnect from a peer
client.disconnectRTC(peerId);
```

## Explanation

### Default channels

WebRTC connections include three default channels:

| Channel | Max payload | Use case |
|---------|-------------|----------|
| `control` | 64 KB | Commands, state updates |
| `stream` | 16 KB | High-frequency data (cursors, audio levels) |
| `state` | — | State synchronization |

### Transport selection

Use `preferTransport` in delivery options to control routing:

- **`"ws"`** — always use WebSocket (default)
- **`"rtc"`** — prefer WebRTC data channels
- **`"auto"`** — let the client choose based on connection availability and message characteristics

### Fallback behavior

When `fallback: true` (default), messages intended for RTC are sent over WebSocket if no RTC connection exists to the target peer. This lets you use `preferTransport: "rtc"` without worrying about connection state.

## Variations

### Auto-connect to all peers

```typescript
// Automatically establish RTC with every new peer
client.peers$.subscribe((peers) => {
  for (const peer of peers) {
    client.connectRTC(peer.id).catch(() => {
      // RTC not supported by this peer — WebSocket fallback will handle it
    });
  }
});
```

### Custom channel configuration

```typescript
// Connect with custom channels
await client.connectRTC(peerId, ["audio", "video", "control"]);

// Send on custom channels via delivery options
client.send(peerId, audioLevelData, {
  delivery: { preferTransport: "rtc", reliability: "unreliable" },
});
client.send(peerId, frameData, {
  delivery: { preferTransport: "rtc", reliability: "unreliable" },
});
```

### Mixed transport messaging

```typescript
// High-frequency data over RTC
client.publish("cursor-updates", cursorData, {
  delivery: { preferTransport: "rtc", reliability: "unreliable" },
});

// Important commands over WebSocket
client.publish("game-events", { event: "round-start" }, {
  delivery: { preferTransport: "ws", reliability: "reliable" },
  priority: "high",
});
```
