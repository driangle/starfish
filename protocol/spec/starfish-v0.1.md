# Starfish Protocol Specification v0.1

## 1. Purpose

Starfish is a transport-neutral realtime protocol for creative coding, networked
performance, multiplayer sketches, installations, live visuals, sound systems,
and distributed browser-based artworks.

Starfish supports:

- Sessions
- Presence
- Topic publish/subscribe
- Direct messaging
- Broadcast messaging
- Shared data operations
- Event streams
- WebSocket routing
- Optional WebRTC peer-to-peer data channels

The protocol uses one canonical message envelope across all transports.

WebSocket is the required control plane. WebRTC is an optional data plane.

---

## 2. Core Model

A Starfish network contains:

| Concept   | Description                                            |
| --------- | ------------------------------------------------------ |
| Server    | Authoritative session coordinator and WebSocket router. |
| Session   | Named realtime room.                                   |
| Client    | Participant connected to a session.                    |
| Topic     | Named pub/sub channel scoped to a session.             |
| Peer      | Another client in the same session.                    |
| Transport | `"ws"` or `"rtc"`.                                     |
| Data store| Scoped key-value state maintained by the server.       |

### 2.1 Transport Responsibilities

**WebSocket** is always used for:

- Authentication
- Joining and leaving sessions
- Presence
- Subscription management
- WebRTC signaling
- Server-backed data operations
- Fallback routing
- Reliable control messages

**WebRTC** may be used for:

- Low-latency direct messages
- High-frequency sensor data
- Pose, cursor, gesture, audio-analysis, visual-control streams
- Optional peer-to-peer topic delivery

---

## 3. Connection Lifecycle

### 3.1 WebSocket Connection

Client connects to:

```
wss://<server>/starfish
```

After connection, the client sends `client.hello`:

```json
{
  "v": 1,
  "id": "msg_001",
  "type": "client.hello",
  "ts": 1783440000000,
  "payload": {
    "client": {
      "name": "projector-left",
      "role": "visuals",
      "meta": {}
    },
    "capabilities": {
      "rtc": true
    },
    "auth": {
      "type": "none"
    }
  }
}
```

Server replies with `server.welcome`:

```json
{
  "v": 1,
  "id": "msg_002",
  "type": "server.welcome",
  "ts": 1783440000010,
  "replyTo": "msg_001",
  "payload": {
    "clientId": "client_a7f3",
    "resumeToken": "rt_8f2a1b3c4d5e",
    "resumeTimeout": 30000,
    "serverTime": 1783440000010,
    "heartbeatInterval": 15000,
    "sessionRequired": true,
    "rtc": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
      ]
    }
  }
}
```

### 3.2 Reconnection

On WebSocket disconnect, the server holds the client's state (session
memberships, topic subscriptions, presence) for the duration of
`resumeTimeout` (provided in `server.welcome`). During this window, other
clients see the disconnected client as temporarily offline -- the server
does NOT emit `client.disconnected` immediately.

**Resuming:** The client sends `client.hello` with `resumeToken`:

```json
{
  "v": 1,
  "id": "msg_003",
  "type": "client.hello",
  "ts": 1783440002000,
  "payload": {
    "resumeToken": "rt_8f2a1b3c4d5e",
    "capabilities": {
      "rtc": true
    }
  }
}
```

If the token is valid and not expired, the server responds with
`server.welcome` and the original `clientId`. The client's session
memberships, topic subscriptions, and presence are restored:

```json
{
  "v": 1,
  "id": "msg_004",
  "type": "server.welcome",
  "ts": 1783440002010,
  "replyTo": "msg_003",
  "payload": {
    "clientId": "client_a7f3",
    "resumed": true,
    "resumeToken": "rt_9a4b2c5d6e7f",
    "resumeTimeout": 30000,
    "serverTime": 1783440002010,
    "heartbeatInterval": 15000,
    "sessions": ["show-abc"],
    "rtc": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
      ]
    }
  }
}
```

A new `resumeToken` is issued on each successful connection. The previous
token is invalidated.

**Resume failed or expired:** If the token is invalid or the timeout has
elapsed, the server responds with a fresh `server.welcome` (new `clientId`,
`resumed: false`). The client must re-join sessions and re-subscribe.

**Fresh connection** (no resume): Omit `resumeToken` from `client.hello`.
The server assigns a new `clientId` with no prior state.

**RTC peer connections** are always invalidated on disconnect and must be
re-established after reconnection, even on successful resume.

**Timeout behavior:** If the resume window expires without reconnection:

1. The server emits `client.disconnected` with reason `"timeout"` to all
   sessions the client was in.
2. The client's state is destroyed.
3. The `resumeToken` is invalidated.

---

## 4. Canonical Message Envelope

Every Starfish frame uses this envelope over both WebSocket and WebRTC.

```typescript
type StarfishFrame = {
  v: 1
  id: string
  type: string
  ts?: number
  session?: string
  from?: string
  to?: string | string[]
  topic?: string
  ack?: boolean
  replyTo?: string
  transport?: "ws" | "rtc"
  options?: Options
  payload?: any
  error?: StarfishError
}
```

### 4.1 Required Fields

All frames MUST include:

| Field  | Description                          |
| ------ | ------------------------------------ |
| `v`    | Protocol version. Always `1`.        |
| `id`   | Unique message identifier.           |
| `type` | Message type string.                 |

### 4.2 Message ID

The `id` field is a client-generated string, unique within that client's
connection. The simplest approach is a monotonic counter (`"1"`, `"2"`, `"3"`).
UUIDs are also acceptable.

Server-generated messages (events, responses) use server-assigned IDs.

IDs are used for:

- Acknowledgement routing (`replyTo`)
- Deduplication
- Debugging and tracing

### 4.3 Reserved Top-Level Fields

Applications MUST place custom data inside `payload`, not at the top level.

Reserved fields: `v`, `id`, `type`, `ts`, `session`, `from`, `to`, `topic`,
`ack`, `replyTo`, `transport`, `options`, `payload`, `error`.

### 4.4 Type Field Convention

Inbound message types are verbs describing intent:

- `topic.publish`, `client.send`, `session.broadcast`, `presence.set`

Delivered message types are nouns describing what arrived:

- `topic.message`, `client.message`, `presence.updated`

The server rewrites the `type` field during routing. Clients receive delivered
types, never the sender's verb form.

---

## 5. Message Options

Protocol-level options are placed in the `options` field, separate from
application data in `payload`.

```typescript
type Delivery = {
  reliability?: "reliable" | "unreliable" | "latest"
  ordering?: "ordered" | "unordered"
  preferTransport?: "ws" | "rtc" | "auto"
  fallback?: boolean
  includeSelf?: boolean
}

type Options = {
  delivery?: Delivery
  priority?: "low" | "normal" | "high" | "critical"
  ttl?: number
  requireAck?: boolean
}
```

**Defaults** (applied when `options` is omitted):

```json
{
  "delivery": {
    "reliability": "reliable",
    "ordering": "ordered",
    "preferTransport": "auto",
    "fallback": true
  },
  "priority": "normal"
}
```

### 5.1 Delivery Options

| Field              | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `reliability`      | `"reliable"`: message should arrive. `"unreliable"`: may be dropped. `"latest"`: only newest value matters. |
| `ordering`         | `"ordered"`: preserve order within lane. `"unordered"`: allow faster unordered delivery. |
| `preferTransport`  | Preferred transport path.                              |
| `fallback`         | Use WebSocket if RTC path fails.                       |
| `includeSelf`      | Include sender in broadcast delivery. Default `false`. |

### 5.2 General Options

| Field              | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `priority`         | Message priority: `"low"`, `"normal"`, `"high"`, `"critical"`. |
| `ttl`              | Discard if older than this many milliseconds.          |
| `requireAck`       | Receiver must acknowledge.                             |

Options values are **hints**, not guarantees. Implementations SHOULD honor them on
a best-effort basis.

---

## 6. Sessions

### 6.1 Join Session

Sessions are ephemeral -- they exist as long as at least one client is
connected. When the last client leaves, the server MAY destroy the session
and its associated data.

If the session does not exist, the server returns a `session.not_found` error
unless `create: true` is set in the payload. There is no separate
`session.create` message -- creation is an explicit option on join.

```json
{
  "v": 1,
  "id": "msg_010",
  "type": "session.join",
  "session": "show-abc",
  "payload": {
    "create": true,
    "name": "dancer-1",
    "role": "performer",
    "meta": {
      "color": "red"
    }
  }
}
```

Response:

```json
{
  "v": 1,
  "id": "msg_011",
  "type": "session.joined",
  "session": "show-abc",
  "replyTo": "msg_010",
  "payload": {
    "clientId": "client_a7f3",
    "clients": [
      {
        "id": "client_a7f3",
        "name": "dancer-1",
        "role": "performer",
        "meta": {}
      }
    ]
  }
}
```

### 6.2 Leave Session

```json
{
  "v": 1,
  "id": "msg_012",
  "type": "session.leave",
  "session": "show-abc"
}
```

### 6.3 Session Events

When a client joins:

```json
{
  "v": 1,
  "id": "evt_001",
  "type": "client.connected",
  "session": "show-abc",
  "payload": {
    "client": {
      "id": "client_b912",
      "name": "camera",
      "role": "sensor"
    }
  }
}
```

When a client leaves or disconnects:

```json
{
  "v": 1,
  "id": "evt_002",
  "type": "client.disconnected",
  "session": "show-abc",
  "payload": {
    "clientId": "client_b912",
    "reason": "left"
  }
}
```

Valid disconnect reasons: `"left"`, `"timeout"`, `"kicked"`, `"error"`.

---

## 7. Topic Pub/Sub

### 7.1 Subscribe

```json
{
  "v": 1,
  "id": "msg_020",
  "type": "topic.subscribe",
  "session": "show-abc",
  "topic": "lights"
}
```

Response:

```json
{
  "v": 1,
  "id": "msg_021",
  "type": "topic.subscribed",
  "session": "show-abc",
  "topic": "lights",
  "replyTo": "msg_020"
}
```

### 7.2 Unsubscribe

```json
{
  "v": 1,
  "id": "msg_022",
  "type": "topic.unsubscribe",
  "session": "show-abc",
  "topic": "lights"
}
```

### 7.3 Publish

```json
{
  "v": 1,
  "id": "msg_023",
  "type": "topic.publish",
  "session": "show-abc",
  "topic": "lights",
  "options": {
    "delivery": {
      "preferTransport": "auto",
      "reliability": "reliable"
    }
  },
  "payload": {
    "cue": "blackout"
  }
}
```

Delivered to subscribers as:

```json
{
  "v": 1,
  "id": "msg_023",
  "type": "topic.message",
  "session": "show-abc",
  "from": "client_a7f3",
  "topic": "lights",
  "payload": {
    "cue": "blackout"
  }
}
```

The publisher does not receive its own message unless it is also subscribed to
the topic.

---

## 8. Direct Messaging

### 8.1 Send to Client

```json
{
  "v": 1,
  "id": "msg_030",
  "type": "client.send",
  "session": "show-abc",
  "to": "client_b912",
  "payload": {
    "gesture": "freeze"
  }
}
```

Delivered as:

```json
{
  "v": 1,
  "id": "msg_030",
  "type": "client.message",
  "session": "show-abc",
  "from": "client_a7f3",
  "to": "client_b912",
  "payload": {
    "gesture": "freeze"
  }
}
```

---

## 9. Broadcast

Broadcast sends to all clients in the current session except the sender.

```json
{
  "v": 1,
  "id": "msg_040",
  "type": "session.broadcast",
  "session": "show-abc",
  "payload": {
    "cue": "start"
  }
}
```

To include the sender in delivery, set `includeSelf` in `options.delivery`:

```json
{
  "v": 1,
  "id": "msg_041",
  "type": "session.broadcast",
  "session": "show-abc",
  "options": {
    "delivery": {
      "includeSelf": true
    }
  },
  "payload": {
    "cue": "start"
  }
}
```

**SDK mapping:**

```typescript
starfish.broadcast(payload, { includeSelf: false })
```

---

## 10. Presence

Presence is ephemeral per-client metadata scoped to a session. It is always
full-replace -- there is no partial diff. Clients send the complete presence
object each time.

### 10.1 Set Presence

```json
{
  "v": 1,
  "id": "msg_050",
  "type": "presence.set",
  "session": "show-abc",
  "payload": {
    "role": "dancer",
    "color": "red",
    "x": 0.4,
    "y": 0.8
  }
}
```

### 10.2 Presence Update Event

```json
{
  "v": 1,
  "id": "evt_050",
  "type": "presence.updated",
  "session": "show-abc",
  "from": "client_a7f3",
  "payload": {
    "role": "dancer",
    "color": "red",
    "x": 0.4,
    "y": 0.8
  }
}
```

### 10.3 Throttling

Servers SHOULD throttle presence broadcasts. Recommended default: at most one
broadcast per client per 50ms (20 Hz). Clients sending faster than the throttle
rate will have intermediate values dropped -- only the latest value is
broadcast.

For high-frequency ephemeral data (60fps cursor positions, sensor streams),
use `topic.publish` with `options.delivery.reliability: "latest"` instead of presence.

Presence uses WebSocket unless the implementation explicitly opts into RTC
delivery for presence.

---

## 11. Shared Data Operations

Data operations are server-authoritative and MUST use WebSocket.

### 11.1 Save

```json
{
  "v": 1,
  "id": "msg_060",
  "type": "data.save",
  "session": "show-abc",
  "payload": {
    "key": "score",
    "scope": "session",
    "op": "replace",
    "data": 12
  }
}
```

Response:

```json
{
  "v": 1,
  "id": "msg_061",
  "type": "data.saved",
  "session": "show-abc",
  "replyTo": "msg_060",
  "payload": {
    "key": "score",
    "scope": "session",
    "data": 12,
    "version": 3
  }
}
```

**Scopes:**

| Scope     | Description                                      |
| --------- | ------------------------------------------------ |
| `self`    | Private to the client. Other clients cannot read. |
| `session` | Shared across all clients in the session.        |

**Operations:**

| Op             | Description                                  |
| -------------- | -------------------------------------------- |
| `replace`      | Replace entire value.                        |
| `merge`        | Shallow merge into existing object.          |
| `set.add`      | Add element to a set.                        |
| `set.remove`   | Remove element from a set.                   |
| `list.add`     | Append element to a list.                    |
| `list.remove`  | Remove element from a list.                  |
| `counter.add`  | Add numeric value to counter.                |
| `delete`       | Delete the key.                              |

### 11.2 Conflict Resolution

The default conflict strategy is **last-write-wins**. Clients that need
stronger guarantees can use **optimistic concurrency** via `expectedVersion`.

The `version` field is a monotonically increasing integer per key, maintained
by the server. It is returned in `data.saved`, `data.value`, and
`data.changed` responses.

**Last-write-wins** (default): omit `expectedVersion`. The server accepts
the write unconditionally.

**Optimistic concurrency**: include `expectedVersion` in the save. The server
rejects the write if the key's current version does not match.

```json
{
  "v": 1,
  "id": "msg_060",
  "type": "data.save",
  "session": "show-abc",
  "payload": {
    "key": "score",
    "scope": "session",
    "op": "replace",
    "data": 12,
    "expectedVersion": 2
  }
}
```

If the version does not match, the server responds with `data.conflict`:

```json
{
  "v": 1,
  "id": "err_060",
  "type": "error",
  "replyTo": "msg_060",
  "error": {
    "code": "data.conflict",
    "message": "Version mismatch.",
    "details": {
      "key": "score",
      "expectedVersion": 2,
      "actualVersion": 5,
      "currentData": 47
    }
  }
}
```

The `details.currentData` field returns the current value so the client can
retry without an extra `data.get` round-trip.

For a new key that does not yet exist, use `"expectedVersion": 0`.

### 11.3 Get

```json
{
  "v": 1,
  "id": "msg_062",
  "type": "data.get",
  "session": "show-abc",
  "payload": {
    "key": "score",
    "scope": "session"
  }
}
```

Response:

```json
{
  "v": 1,
  "id": "msg_063",
  "type": "data.value",
  "session": "show-abc",
  "replyTo": "msg_062",
  "payload": {
    "key": "score",
    "scope": "session",
    "data": 12,
    "version": 3
  }
}
```

### 11.4 Data Change Event

Broadcast to all clients in the session when a shared value changes:

```json
{
  "v": 1,
  "id": "evt_060",
  "type": "data.changed",
  "session": "show-abc",
  "payload": {
    "key": "score",
    "scope": "session",
    "op": "replace",
    "data": 12,
    "version": 3,
    "updatedBy": "client_a7f3"
  }
}
```

---

## 12. WebRTC

WebRTC is optional and always coordinated through WebSocket signaling.

### 12.1 Responsibilities

**The WebSocket server** is responsible for:

- Peer discovery
- SDP and ICE relay (signaling)
- Session authorization
- Fallback delivery
- Topic subscription authority

**RTC peers** are responsible for:

- DataChannel creation and management
- Direct delivery
- Optional low-latency topic fanout
- Peer health checks

---

## 13. RTC Connection Lifecycle

### 13.1 Request Peer Connection

```json
{
  "v": 1,
  "id": "rtc_001",
  "type": "rtc.connect",
  "session": "show-abc",
  "to": "client_b912",
  "payload": {
    "channels": ["control", "stream", "state"]
  }
}
```

### 13.2 RTC Offer

```json
{
  "v": 1,
  "id": "rtc_002",
  "type": "rtc.offer",
  "session": "show-abc",
  "from": "client_a7f3",
  "to": "client_b912",
  "payload": {
    "sdp": "..."
  }
}
```

### 13.3 RTC Answer

```json
{
  "v": 1,
  "id": "rtc_003",
  "type": "rtc.answer",
  "session": "show-abc",
  "from": "client_b912",
  "to": "client_a7f3",
  "payload": {
    "sdp": "..."
  }
}
```

### 13.4 ICE Candidate

```json
{
  "v": 1,
  "id": "rtc_004",
  "type": "rtc.ice",
  "session": "show-abc",
  "from": "client_a7f3",
  "to": "client_b912",
  "payload": {
    "candidate": {}
  }
}
```

### 13.5 RTC Connected

```json
{
  "v": 1,
  "id": "evt_070",
  "type": "rtc.connected",
  "session": "show-abc",
  "from": "client_a7f3",
  "to": "client_b912"
}
```

### 13.6 RTC Disconnected

```json
{
  "v": 1,
  "id": "evt_071",
  "type": "rtc.disconnected",
  "session": "show-abc",
  "from": "client_a7f3",
  "to": "client_b912",
  "payload": {
    "reason": "ice_failed"
  }
}
```

---

## 14. RTC DataChannels

Starfish defines three standard DataChannel lanes.

### 14.1 Control Channel

**Label:** `starfish.control`

```json
{ "ordered": true }
```

Used for:

- Reliable direct messages
- Control cues
- Acknowledgements
- Peer-level protocol events

### 14.2 Stream Channel

**Label:** `starfish.stream`

```json
{ "ordered": false, "maxRetransmits": 0 }
```

Used for:

- Pose and cursor positions
- Sensor streams
- Audio analysis
- Continuous ephemeral values

### 14.3 State Channel

**Label:** `starfish.state`

```json
{ "ordered": true }
```

Used for:

- Peer-shared state
- State diffs
- Optional CRDT payloads

All RTC DataChannel payloads use the same Starfish frame envelope.

---

## 15. Transport Selection

The client chooses transport based on `options.delivery.preferTransport`.

### 15.1 `preferTransport: "ws"`

Always send through WebSocket.

### 15.2 `preferTransport: "rtc"`

Send through RTC if available. If unavailable:

- If `fallback: true`: send through WebSocket.
- If `fallback: false`: fail with `transport.unavailable` error.

### 15.3 `preferTransport: "auto"`

Recommended default routing:

| Message type                           | Default transport                    |
| -------------------------------------- | ------------------------------------ |
| `data.*`                               | WebSocket only                       |
| `session.*`                            | WebSocket only                       |
| `presence.*`                           | WebSocket                            |
| `topic.publish` (reliable)             | WebSocket                            |
| `topic.publish` (unreliable / latest)  | RTC if peer path exists, else WS     |
| `client.send` (reliable)               | RTC if connected, else WS            |
| `client.send` (unreliable / latest)    | RTC preferred                        |
| `session.broadcast`                    | WebSocket (unless RTC mesh enabled)  |

---

## 16. Topic Routing over RTC

Topic subscription authority remains server-side. A client may only receive
RTC topic messages for topics it has subscribed to through WebSocket.

**Flow:**

1. Client subscribes via WebSocket.
2. Server records subscription.
3. Server pushes subscription map to peers via `topic.peers`.
4. Publisher delivers topic messages over RTC to peers listed in the map.
5. **Receiver MUST validate** incoming RTC topic messages against its own
   subscription set. Drop unauthorized messages silently.

The subscription map may be stale. This is acceptable -- Starfish uses
**eventual consistency** for RTC topic routing:

- A newly subscribed client may miss messages until the publisher receives
  the updated `topic.peers`.
- A recently unsubscribed client may receive messages it no longer wants.
  The receiver drops them.

### 16.1 Subscription Map Event

```json
{
  "v": 1,
  "id": "evt_080",
  "type": "topic.peers",
  "session": "show-abc",
  "topic": "pose",
  "payload": {
    "subscribers": ["client_b912", "client_c441"]
  }
}
```

---

## 17. Acknowledgements

Any frame may request acknowledgement via `options.requireAck: true`.

Request:

```json
{
  "v": 1,
  "id": "msg_090",
  "type": "client.send",
  "session": "show-abc",
  "to": "client_b912",
  "options": {
    "requireAck": true
  },
  "payload": {
    "cue": "go"
  }
}
```

Positive acknowledgement:

```json
{
  "v": 1,
  "id": "ack_090",
  "type": "ack",
  "replyTo": "msg_090",
  "session": "show-abc",
  "from": "client_b912",
  "payload": {
    "received": true
  }
}
```

Negative acknowledgement:

```json
{
  "v": 1,
  "id": "ack_091",
  "type": "nack",
  "replyTo": "msg_090",
  "error": {
    "code": "topic.not_subscribed",
    "message": "Receiver is not subscribed to topic."
  }
}
```

---

## 18. Error Format

```typescript
type StarfishError = {
  code: string
  message: string
  details?: any
}
```

Error response:

```json
{
  "v": 1,
  "id": "err_001",
  "type": "error",
  "replyTo": "msg_001",
  "error": {
    "code": "session.not_found",
    "message": "Session does not exist."
  }
}
```

### 18.1 Error Codes

| Code                           | Description                          |
| ------------------------------ | ------------------------------------ |
| `auth.required`                | Authentication required.             |
| `auth.failed`                  | Authentication failed.               |
| `session.not_found`            | Session does not exist.              |
| `session.full`                 | Session is at capacity.              |
| `client.not_found`             | Target client not found.             |
| `topic.invalid`                | Invalid topic name.                  |
| `topic.not_subscribed`         | Client not subscribed to topic.      |
| `transport.unavailable`        | Requested transport not available.   |
| `rtc.failed`                   | RTC connection failed.               |
| `data.invalid_op`              | Invalid data operation.              |
| `data.conflict`                | Version mismatch (optimistic concurrency). |
| `data.forbidden`               | Not authorized for data operation.   |
| `rate_limited`                 | Client is sending too fast.          |
| `payload.too_large`            | Payload exceeds size limit.          |
| `protocol.invalid_frame`       | Malformed frame.                     |
| `protocol.unsupported_version` | Unsupported protocol version.        |
| `resume.invalid`               | Resume token is invalid.             |
| `resume.expired`               | Resume token has expired.            |
| `internal_error`               | Server internal error.               |

---

## 19. Heartbeats

Starfish uses application-level heartbeats (not WebSocket ping frames) for
visibility across both transports and to enable latency measurement.

WebSocket heartbeat:

```json
{
  "v": 1,
  "id": "ping_001",
  "type": "ping",
  "ts": 1783440000000
}
```

Response:

```json
{
  "v": 1,
  "id": "pong_001",
  "type": "pong",
  "replyTo": "ping_001",
  "ts": 1783440000010
}
```

The heartbeat interval is provided by the server in `server.welcome`. If a
client misses heartbeats for 2x the interval, the server SHOULD consider the
client disconnected.

RTC peers MAY send heartbeats over the control channel using the same format.

---

## 20. Clock Sync

Server time sync is part of the WebSocket control plane.

Request:

```json
{
  "v": 1,
  "id": "clock_001",
  "type": "clock.sync",
  "ts": 1783440000000
}
```

Response:

```json
{
  "v": 1,
  "id": "clock_002",
  "type": "clock.synced",
  "replyTo": "clock_001",
  "payload": {
    "serverTime": 1783440000010
  }
}
```

Clients estimate offset using round-trip time. Implementations SHOULD take
multiple samples (minimum 3) and use the median offset.

**SDK mapping:**

```typescript
await starfish.clock.sync()   // takes multiple samples
starfish.clock.now()           // returns estimated server time
starfish.clock.offset          // current offset in ms
starfish.at(time, callback)    // schedule at server time
```

---

## 21. Event Stream

All lifecycle and protocol events use normal Starfish frames. The SDK provides
filtered event streams.

**SDK mapping:**

```typescript
starfish.events$({ type: "client.connected" })
starfish.events$({ topic: "lights" })
starfish.events$({ from: "client_a7f3" })
```

### 21.1 Event Types

| Event type            | Trigger                          |
| --------------------- | -------------------------------- |
| `client.connected`    | Client joined session.           |
| `client.disconnected` | Client left or timed out.        |
| `session.joined`      | This client joined a session.    |
| `session.left`        | This client left a session.      |
| `presence.updated`    | Client presence changed.         |
| `topic.subscribed`    | Subscription confirmed.          |
| `topic.unsubscribed`  | Unsubscription confirmed.        |
| `topic.message`       | Topic message received.          |
| `client.message`      | Direct message received.         |
| `data.changed`        | Shared data value changed.       |
| `rtc.connected`       | RTC peer connection established. |
| `rtc.disconnected`    | RTC peer connection lost.        |
| `transport.changed`   | Active transport changed.        |
| `error`               | Error occurred.                  |
| `ack`                 | Positive acknowledgement.        |
| `nack`                | Negative acknowledgement.        |

---

## 22. SDK API Reference

Recommended JavaScript/TypeScript API surface:

```typescript
const starfish = new StarfishClient({
  server: "wss://example.com/starfish",
  rtc: {
    enabled: true,
    mode: "auto",
    topology: "mesh",
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" }
    ]
  }
})

// Session
await starfish.join("show-abc", { name: "projector-left", role: "visuals" })
await starfish.leave()

// Topics
starfish.subscribe("lights", msg => { /* callback */ })
starfish.unsubscribe("lights")
starfish.publish("lights", { cue: "blackout" })
starfish.topic$("lights")  // Observable stream

// Direct messaging
starfish.send("client_b912", { gesture: "freeze" })

// Broadcast
starfish.broadcast({ cue: "start" }, { includeSelf: false })

// Shared data
await starfish.save({ key: "score", data: 12, op: "replace", scope: "session" })
const score = await starfish.get({ key: "score", scope: "session" })

// Presence
starfish.presence.set({ role: "dancer", color: "red", x: 0.4, y: 0.8 })
starfish.presence$   // Observable of all presence

// Observables
starfish.clients$    // current client list
starfish.peers$      // other clients in session
starfish.events$(filter)  // filtered event stream

// Clock
await starfish.clock.sync()
starfish.clock.now()
starfish.at(serverTime, callback)
```

---

## 23. Security Rules

Servers MUST enforce the following:

1. A client may only send messages within sessions it has joined.
2. A client may only use its assigned `clientId`.
3. A client may not set `from` on outbound WebSocket messages. The server
   overwrites `from` with the authenticated `clientId`.
4. RTC receivers MUST validate `from`, `session`, and `topic` fields against
   known state. Drop invalid messages silently.
5. Data operations are server-authoritative. Clients cannot bypass the server
   for data mutations.
6. WebRTC signaling is only allowed between clients in the same session.
7. Servers SHOULD support optional session tokens for authentication.

---

## 24. Payload Limits

Recommended defaults:

| Limit                | Value      |
| -------------------- | ---------- |
| WebSocket message    | 64 KB      |
| RTC control channel  | 64 KB      |
| RTC stream channel   | 16 KB      |
| Presence payload     | 8 KB       |
| Data value           | 256 KB     |
| Topic name length    | 128 chars  |
| Client metadata      | 16 KB      |

Large binary assets SHOULD NOT be sent through Starfish frames. Use URLs,
hashes, or external asset references instead.

---

## 25. Binary Payloads

v0.1 is JSON-first. Binary support is deferred to a future version.

Applications needing binary transport in v0.1 should use a reference pattern:

```json
{
  "v": 1,
  "id": "bin_001",
  "type": "topic.publish",
  "topic": "video-frame",
  "payload": {
    "encoding": "binary-ref",
    "mime": "image/jpeg",
    "url": "https://cdn.example.com/frames/001.jpg"
  }
}
```

The binary transport mechanism is implementation-specific and outside the scope
of this specification.

---

## 26. Versioning

The protocol version is the `v` field on every frame. Current version: `1`.

Servers MUST reject frames with unsupported versions:

```json
{
  "v": 1,
  "id": "err_ver",
  "type": "error",
  "error": {
    "code": "protocol.unsupported_version",
    "message": "Unsupported protocol version."
  }
}
```

Version negotiation is not supported in v0.1. Both client and server must
agree on protocol version `1`.

---

## 27. Design Principles

1. **One envelope, two transports.** Every message uses the same frame format
   regardless of whether it travels over WebSocket or WebRTC.

2. **WebSocket provides correctness.** Session state, subscriptions, data
   operations, and signaling are always routed through the reliable control
   plane.

3. **WebRTC provides speed.** Low-latency, high-frequency data can bypass the
   server when peer connections are available.

4. **Creative coders should not need to think about transport.** The SDK
   abstracts transport selection. Users who want control over latency,
   reliability, or topology can opt in via delivery options.
