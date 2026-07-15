# Starfish Protocol Specification v0.1

## 1. Purpose

Starfish is a transport-neutral realtime protocol for creative coding, networked
performance, multiplayer sketches, installations, live visuals, sound systems,
and distributed browser-based artworks.

Starfish supports:

- Sessions
- Pools (matchmaking)
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

| Concept    | Description                                            |
| ---------- | ------------------------------------------------------ |
| Server     | Authoritative session coordinator and WebSocket router. |
| Session    | Named realtime room.                                   |
| Pool       | Named matchmaking queue that pairs clients into sessions. |
| Client     | Participant connected to a session.                    |
| Topic      | Named pub/sub channel scoped to a session.             |
| Peer       | Another client in the same session.                    |
| Transport  | `"ws"` or `"rtc"`.                                     |
| Data store | Scoped key-value state maintained by the server.       |

### 2.1 Transport Responsibilities

**WebSocket** is always used for:

- Authentication
- Joining and leaving sessions
- Pool matchmaking
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
memberships, pool memberships, topic subscriptions, presence) for the duration
of `resumeTimeout` (provided in `server.welcome`). During this window, other
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
memberships, pool memberships, topic subscriptions, and presence are restored:

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
    "pools": ["distant-touch"],
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
`resumed: false`). The client must re-join sessions, re-enter pools, and
re-subscribe.

**Fresh connection** (no resume): Omit `resumeToken` from `client.hello`.
The server assigns a new `clientId` with no prior state.

**RTC peer connections** are always invalidated on disconnect and must be
re-established after reconnection, even on successful resume.

**Timeout behavior:** If the resume window expires without reconnection:

1. The server emits `client.disconnected` with reason `"timeout"` to all
   sessions the client was in.
2. The server emits `pool.member.left` with reason `"timeout"` to all
   pools the client was in.
3. The client's state is destroyed.
4. The `resumeToken` is invalidated.

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

## 7. Pools

Pools are named matchmaking queues that pair clients into sessions. A pool
collects waiting members and groups them based on a configurable mode. The
server enforces the matching rules and guarantees atomic match execution.

Pools use WebSocket only.

### 7.1 Core Concepts

| Concept     | Description                                                |
| ----------- | ---------------------------------------------------------- |
| Pool        | Named matchmaking queue with a fixed mode and group size.  |
| Member      | Client waiting in the pool.                                |
| Matchmaker  | Privileged client that controls matching in delegated mode. |
| Claim       | Request to pair with a specific member.                    |
| Match       | Server-confirmed grouping. Members receive a session name. |

### 7.2 Modes

The mode is set at pool creation and is immutable for the pool's lifetime.
It determines how members are matched.

| Mode          | Who matches   | Members visible | How it works                                 |
| ------------- | ------------- | --------------- | -------------------------------------------- |
| `auto`        | Server        | No              | Server pairs members automatically (FIFO). Default. |
| `claim`       | Any member    | Yes             | First claim wins. Server matches immediately. |
| `mutual`      | Both members  | Yes             | Both must claim each other.                  |
| `propose`     | Both members  | Yes             | One proposes, other accepts or rejects.      |
| `delegated`   | Matchmaker    | Matchmaker only | Only matchmaker-role clients can assign groups. |

**Auto mode** is the default and the simplest. Members enter the pool and
the server pairs them in FIFO order. Members do not see each other and
cannot send claims. This mode scales to any pool size.

**Claim-based modes** (`claim`, `mutual`, `propose`) give members visibility
into the full member list. Members choose who to match with using client-side
logic. These modes are designed for small to medium pools where member
visibility is practical.

**Delegated mode** gives matching control to a matchmaker client. Regular
members do not see each other. The matchmaker receives member events and
assigns groups. This mode scales to any pool size.

### 7.3 Enter Pool

Minimal example (auto mode, the common case):

```json
{
  "v": 1,
  "id": "msg_100",
  "type": "pool.enter",
  "payload": {
    "pool": "distant-touch",
    "create": true,
    "groupSize": 2
  }
}
```

Full example with all fields:

```json
{
  "v": 1,
  "id": "msg_100",
  "type": "pool.enter",
  "payload": {
    "pool": "distant-touch",
    "create": true,
    "mode": "claim",
    "groupSize": 2,
    "role": "member",
    "attributes": {
      "mood": "calm",
      "language": "en"
    },
    "filter": {
      "language": "@self"
    }
  }
}
```

| Field        | Description                                                     |
| ------------ | --------------------------------------------------------------- |
| `pool`       | Pool name.                                                      |
| `create`     | Create the pool if it doesn't exist. Same pattern as `session.join`. |
| `mode`       | Matching mode. Default `"auto"`. Only used on creation, ignored if pool exists. |
| `groupSize`  | Number of clients per match. Only used on creation.             |
| `role`       | `"member"` (default) or `"matchmaker"` (delegated mode only).   |
| `attributes` | Opaque metadata about this member. Broadcast to other members in claim-based modes, or to the matchmaker in delegated mode. Used by filters in auto mode. |
| `filter`     | Matching filter for auto mode. See section 7.4.                 |

If the pool does not exist and `create` is false or omitted, the server
returns a `pool.not_found` error.

**Response (auto and delegated modes):**

```json
{
  "v": 1,
  "id": "msg_101",
  "type": "pool.entered",
  "replyTo": "msg_100",
  "payload": {
    "pool": "distant-touch",
    "mode": "auto",
    "groupSize": 2
  }
}
```

In auto and delegated modes, the response does not include a member list.
Members are invisible to each other.

**Response (claim-based modes):**

```json
{
  "v": 1,
  "id": "msg_101",
  "type": "pool.entered",
  "replyTo": "msg_100",
  "payload": {
    "pool": "distant-touch",
    "mode": "claim",
    "groupSize": 2,
    "members": [
      { "id": "client_a7f3", "attributes": { "mood": "calm" } },
      { "id": "client_b912", "attributes": { "mood": "wild" } }
    ]
  }
}
```

In claim-based modes, the response includes the full member list so the
client can begin making matching decisions.

### 7.4 Filters (auto mode)

In auto mode, the server matches members automatically. By default, matching
is FIFO -- the two longest-waiting members are paired. Filters allow members
to constrain who they can be matched with.

A filter is a set of attribute keys with expected values. A match is only
made when all filters on **both** sides are satisfied.

**Literal value** -- match with members who have this exact attribute value:

```json
{
  "filter": {
    "language": "en"
  }
}
```

**`@self` reference** -- match with members who have the same value as this
member's own attribute:

```json
{
  "filter": {
    "language": "@self"
  }
}
```

If a member enters with `attributes: { "language": "en" }` and
`filter: { "language": "@self" }`, the server will only match them with
other members whose `language` attribute is `"en"`.

**Multiple filters** are combined with AND. All must be satisfied:

```json
{
  "attributes": { "language": "en", "region": "europe" },
  "filter": {
    "language": "@self",
    "region": "@self"
  }
}
```

**Filter compatibility:** A match requires that both members' filters are
satisfied by the other's attributes. If member A filters on
`{ "language": "@self" }` and member B has no filter, the match still
requires B's `language` attribute to equal A's. B's lack of filter means
B accepts anyone -- but A's filter still constrains the match.

If a member's filter references an attribute key that the other member does
not have, the filter is not satisfied and the match is skipped.

Filters are ignored in claim-based and delegated modes. In those modes,
matching decisions are made by clients or the matchmaker, not the server.

### 7.5 Leave Pool

```json
{
  "v": 1,
  "id": "msg_102",
  "type": "pool.leave",
  "payload": {
    "pool": "distant-touch"
  }
}
```

### 7.6 Pool Member Events

Member events are broadcast differently depending on the mode:

- **Auto mode:** No member events are sent. Members are invisible.
- **Claim-based modes:** Member events are sent to all members.
- **Delegated mode:** Member events are sent to matchmaker clients only.

When a member enters the pool:

```json
{
  "v": 1,
  "id": "evt_100",
  "type": "pool.member.joined",
  "payload": {
    "pool": "distant-touch",
    "member": {
      "id": "client_c441",
      "attributes": { "mood": "energetic" }
    }
  }
}
```

When a member leaves or is removed:

```json
{
  "v": 1,
  "id": "evt_101",
  "type": "pool.member.left",
  "payload": {
    "pool": "distant-touch",
    "memberId": "client_c441",
    "reason": "left"
  }
}
```

Valid reasons: `"left"`, `"matched"`, `"timeout"`, `"disconnected"`.

### 7.7 Claiming (claim, mutual, propose modes)

Members send `pool.claim` to request a match with a specific target. Claims
are not available in auto or delegated modes.

```json
{
  "v": 1,
  "id": "msg_110",
  "type": "pool.claim",
  "payload": {
    "pool": "distant-touch",
    "target": "client_b912"
  }
}
```

Behavior depends on the pool's mode:

**Claim:** The server matches immediately. The target has no say. The
server responds with `pool.matched` to both clients.

**Mutual:** The server records the claim. If the target has also claimed the
claimer, the match is confirmed and both receive `pool.matched`. If not yet
mutual, the server acknowledges the pending claim:

```json
{
  "v": 1,
  "id": "msg_111",
  "type": "pool.claim.pending",
  "replyTo": "msg_110",
  "payload": {
    "pool": "distant-touch",
    "target": "client_b912"
  }
}
```

**Propose:** The target receives a proposal:

```json
{
  "v": 1,
  "id": "evt_110",
  "type": "pool.proposal",
  "payload": {
    "pool": "distant-touch",
    "from": "client_a7f3",
    "attributes": { "mood": "calm" }
  }
}
```

The target responds with accept or reject:

```json
{
  "v": 1,
  "id": "msg_112",
  "type": "pool.accept",
  "payload": {
    "pool": "distant-touch",
    "from": "client_a7f3"
  }
}
```

```json
{
  "v": 1,
  "id": "msg_113",
  "type": "pool.reject",
  "payload": {
    "pool": "distant-touch",
    "from": "client_a7f3"
  }
}
```

On rejection, the claimer receives:

```json
{
  "v": 1,
  "id": "evt_111",
  "type": "pool.claim.rejected",
  "payload": {
    "pool": "distant-touch",
    "target": "client_b912"
  }
}
```

Both sides remain in the pool and can try again with other members.

### 7.8 Assigning (delegated mode)

In delegated mode, only clients with `role: "matchmaker"` can control
matching. Regular members cannot see each other or send claims. The
matchmaker receives `pool.member.joined` and `pool.member.left` events
and uses them to make matching decisions.

```json
{
  "v": 1,
  "id": "msg_120",
  "type": "pool.assign",
  "payload": {
    "pool": "distant-touch",
    "groups": [
      ["client_a7f3", "client_b912"],
      ["client_c441", "client_d228"]
    ]
  }
}
```

The server validates that all referenced clients are current pool members
and that each group matches the pool's `groupSize`. The matchmaker receives
confirmation:

```json
{
  "v": 1,
  "id": "msg_121",
  "type": "pool.assigned",
  "replyTo": "msg_120",
  "payload": {
    "pool": "distant-touch",
    "matched": [
      { "group": ["client_a7f3", "client_b912"], "session": "dt-a1b2c3" },
      { "group": ["client_c441", "client_d228"], "session": "dt-d4e5f6" }
    ]
  }
}
```

The matchmaker stays in the pool -- it is not consumed by matching. It can
assign multiple batches over time.

A matchmaker that disconnects does not affect existing members. Members
remain in the pool until matched, until they leave, or until their
connection times out. A new matchmaker can enter the pool at any time.

### 7.9 Match Result

On successful match (in any mode), all matched members receive:

```json
{
  "v": 1,
  "id": "evt_120",
  "type": "pool.matched",
  "payload": {
    "pool": "distant-touch",
    "session": "dt-a1b2c3",
    "peers": [
      { "id": "client_a7f3", "attributes": { "mood": "calm" } },
      { "id": "client_b912", "attributes": { "mood": "wild" } }
    ]
  }
}
```

After `pool.matched`:

1. Matched members are removed from the pool.
2. In claim-based modes, other pool members receive `pool.member.left` with
   `reason: "matched"` for each matched member. In delegated mode, the
   matchmaker receives these events. In auto mode, no events are sent.
3. Matched members are **not** automatically joined to the session. They must
   call `session.join` with the provided session name. This gives clients time
   to transition (show a "matched" screen, load assets, etc.).
4. The session name is server-generated and unique.

### 7.10 Group Size

The `groupSize` field determines how many members form a match. It is set at
pool creation and is immutable.

- `groupSize: 2` -- pair matching (distant-touch, 1v1 games).
- `groupSize: 3` or higher -- group matching (team games, ensemble performances).

In claim-based modes (`claim`, `mutual`, `propose`), all members of a
group must be resolved before the match fires. For `groupSize > 2` in
`claim` mode, the server collects claims until a complete group is formed:
when N members have all claimed each other (directly or transitively), the
match fires.

For `groupSize > 2` in `delegated` mode, the matchmaker specifies complete
groups in `pool.assign`.

For `groupSize > 2` in `auto` mode, the server collects members until
`groupSize` is reached (respecting filters), then fires the match.

### 7.11 Pool Lifecycle

- A pool is created on the first `pool.enter` with `create: true`.
- A pool is destroyed when the last member (including matchmakers) leaves.
- Mode and group size are immutable after creation.
- Members that disconnect enter the resume window (same as sessions). If
  they reconnect, their pool membership is restored. If the resume window
  expires, `pool.member.left` fires with `reason: "timeout"`.
- Pending claims are cleared when a member leaves or is matched.

---

## 8. Topic Pub/Sub

### 8.1 Subscribe

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

### 8.2 Unsubscribe

```json
{
  "v": 1,
  "id": "msg_022",
  "type": "topic.unsubscribe",
  "session": "show-abc",
  "topic": "lights"
}
```

### 8.3 Publish

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

## 9. Direct Messaging

### 9.1 Send to Client

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

## 10. Broadcast

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

## 11. Presence

Presence is ephemeral per-client metadata scoped to a session. It is always
full-replace -- there is no partial diff. Clients send the complete presence
object each time.

### 11.1 Set Presence

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

### 11.2 Presence Update Event

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

### 11.3 Throttling

Servers SHOULD throttle presence broadcasts. Recommended default: at most one
broadcast per client per 50ms (20 Hz). Clients sending faster than the throttle
rate will have intermediate values dropped -- only the latest value is
broadcast.

For high-frequency ephemeral data (60fps cursor positions, sensor streams),
use `topic.publish` with `options.delivery.reliability: "latest"` instead of presence.

Presence uses WebSocket unless the implementation explicitly opts into RTC
delivery for presence.

---

## 12. Shared Data Operations

Data operations are server-authoritative and MUST use WebSocket.

### 12.1 Save

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

### 12.2 Conflict Resolution

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

### 12.3 Get

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

### 12.4 Data Change Event

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

## 13. WebRTC

WebRTC is optional and always coordinated through WebSocket signaling.

### 13.1 Responsibilities

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

## 14. RTC Connection Lifecycle

### 14.1 Request Peer Connection

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

### 14.2 RTC Offer

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

### 14.3 RTC Answer

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

### 14.4 ICE Candidate

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

### 14.5 RTC Connected

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

### 14.6 RTC Disconnected

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

## 15. RTC DataChannels

Starfish defines three standard DataChannel lanes.

### 15.1 Control Channel

**Label:** `starfish.control`

```json
{ "ordered": true }
```

Used for:

- Reliable direct messages
- Control cues
- Acknowledgements
- Peer-level protocol events

### 15.2 Stream Channel

**Label:** `starfish.stream`

```json
{ "ordered": false, "maxRetransmits": 0 }
```

Used for:

- Pose and cursor positions
- Sensor streams
- Audio analysis
- Continuous ephemeral values

### 15.3 State Channel

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

## 16. Transport Selection

The client chooses transport based on `options.delivery.preferTransport`.

### 16.1 `preferTransport: "ws"`

Always send through WebSocket.

### 16.2 `preferTransport: "rtc"`

Send through RTC if available. If unavailable:

- If `fallback: true`: send through WebSocket.
- If `fallback: false`: fail with `transport.unavailable` error.

### 16.3 `preferTransport: "auto"`

Recommended default routing:

| Message type                           | Default transport                    |
| -------------------------------------- | ------------------------------------ |
| `data.*`                               | WebSocket only                       |
| `session.*`                            | WebSocket only                       |
| `pool.*`                               | WebSocket only                       |
| `presence.*`                           | WebSocket                            |
| `topic.publish` (reliable)             | WebSocket                            |
| `topic.publish` (unreliable / latest)  | RTC if peer path exists, else WS     |
| `client.send` (reliable)               | RTC if connected, else WS            |
| `client.send` (unreliable / latest)    | RTC preferred                        |
| `session.broadcast`                    | WebSocket (unless RTC mesh enabled)  |

---

## 17. Topic Routing over RTC

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

### 17.1 Subscription Map Event

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

## 18. Acknowledgements

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

## 19. Error Format

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

### 19.1 Error Codes

| Code                           | Description                               |
| ------------------------------ | ----------------------------------------- |
| `auth.required`                | Authentication required.                  |
| `auth.failed`                  | Authentication failed.                    |
| `session.not_found`            | Session does not exist.                   |
| `session.full`                 | Session is at capacity.                   |
| `client.not_found`             | Target client not found.                  |
| `topic.invalid`                | Invalid topic name.                       |
| `topic.not_subscribed`         | Client not subscribed to topic.           |
| `transport.unavailable`        | Requested transport not available.        |
| `rtc.failed`                   | RTC connection failed.                    |
| `data.invalid_op`              | Invalid data operation.                   |
| `data.conflict`                | Version mismatch (optimistic concurrency).|
| `data.forbidden`               | Not authorized for data operation.        |
| `pool.not_found`               | Pool does not exist.                      |
| `pool.not_member`              | Client is not in this pool.               |
| `pool.target_not_found`        | Claim target is not in the pool.          |
| `pool.already_matched`         | Target was already matched.               |
| `pool.mode_mismatch`           | Operation not allowed in this pool mode.  |
| `pool.role_required`           | Operation requires matchmaker role.       |
| `pool.invalid_group`           | Group does not match pool's group size.   |
| `rate_limited`                 | Client is sending too fast.               |
| `payload.too_large`            | Payload exceeds size limit.               |
| `protocol.invalid_frame`       | Malformed frame.                          |
| `protocol.unsupported_version` | Unsupported protocol version.             |
| `resume.invalid`               | Resume token is invalid.                  |
| `resume.expired`               | Resume token has expired.                 |
| `internal_error`               | Server internal error.                    |

---

## 20. Heartbeats

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

## 21. Clock Sync

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

## 22. Event Stream

All lifecycle and protocol events use normal Starfish frames. The SDK provides
filtered event streams.

**SDK mapping:**

```typescript
starfish.events$({ type: "client.connected" })
starfish.events$({ topic: "lights" })
starfish.events$({ from: "client_a7f3" })
```

### 22.1 Event Types

| Event type            | Trigger                              |
| --------------------- | ------------------------------------ |
| `client.connected`    | Client joined session.               |
| `client.disconnected` | Client left or timed out.            |
| `session.joined`      | This client joined a session.        |
| `session.left`        | This client left a session.          |
| `presence.updated`    | Client presence changed.             |
| `topic.subscribed`    | Subscription confirmed.              |
| `topic.unsubscribed`  | Unsubscription confirmed.            |
| `topic.message`       | Topic message received.              |
| `client.message`      | Direct message received.             |
| `data.changed`        | Shared data value changed.           |
| `pool.entered`        | This client entered a pool.          |
| `pool.member.joined`  | Member entered the pool.             |
| `pool.member.left`    | Member left the pool.                |
| `pool.matched`        | This client was matched.             |
| `pool.proposal`       | Received a match proposal.           |
| `pool.claim.pending`  | Claim recorded, awaiting mutual.     |
| `pool.claim.rejected` | Proposal was rejected by target.     |
| `pool.assigned`       | Matchmaker: assignment confirmed.    |
| `rtc.connected`       | RTC peer connection established.     |
| `rtc.disconnected`    | RTC peer connection lost.            |
| `transport.changed`   | Active transport changed.            |
| `error`               | Error occurred.                      |
| `ack`                 | Positive acknowledgement.            |
| `nack`                | Negative acknowledgement.            |

---

## 23. SDK API Reference

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

// Pools (auto mode — the common case)
await starfish.pool.enter("distant-touch", { groupSize: 2 })
await starfish.pool.leave("distant-touch")

// Pools (auto mode with filter)
await starfish.pool.enter("distant-touch", {
  groupSize: 2,
  attributes: { language: "en" },
  filter: { language: "@self" }
})

// Pools (claim-based modes)
await starfish.pool.enter("lobby", { mode: "claim", groupSize: 2 })
starfish.pool.claim("lobby", "client_b912")
starfish.pool.accept("lobby", "client_a7f3")   // propose mode
starfish.pool.reject("lobby", "client_a7f3")   // propose mode
starfish.pool.members$    // Observable of pool members (claim-based modes only)

// Pools (delegated mode)
await starfish.pool.enter("lobby", { mode: "delegated", role: "matchmaker" })
starfish.pool.assign("lobby", [["client_a7f3", "client_b912"]])

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

## 24. Security Rules

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
8. Pool claims and assignments are server-authoritative. The server validates
   that targets are current pool members before executing any match.
9. In delegated pool mode, only clients with `role: "matchmaker"` may send
   `pool.assign`. The server MUST reject `pool.assign` from non-matchmaker
   clients. The server MUST reject `pool.claim` from any client in an auto
   or delegated pool.

---

## 25. Payload Limits

Recommended defaults:

| Limit                | Value      |
| -------------------- | ---------- |
| WebSocket message    | 64 KB      |
| RTC control channel  | 64 KB      |
| RTC stream channel   | 16 KB      |
| Presence payload     | 8 KB       |
| Data value           | 256 KB     |
| Topic name length    | 128 chars  |
| Pool name length     | 128 chars  |
| Pool attributes      | 8 KB       |
| Client metadata      | 16 KB      |

Large binary assets SHOULD NOT be sent through Starfish frames. Use URLs,
hashes, or external asset references instead.

---

## 26. Binary Payloads

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

## 27. Versioning

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

## 28. Design Principles

1. **One envelope, two transports.** Every message uses the same frame format
   regardless of whether it travels over WebSocket or WebRTC.

2. **WebSocket provides correctness.** Session state, subscriptions, pool
   matching, data operations, and signaling are always routed through the
   reliable control plane.

3. **WebRTC provides speed.** Low-latency, high-frequency data can bypass the
   server when peer connections are available.

4. **Creative coders should not need to think about transport.** The SDK
   abstracts transport selection. Users who want control over latency,
   reliability, or topology can opt in via delivery options.

5. **Server provides mechanics, clients provide intelligence.** The server
   enforces rules (atomicity, authorization, delivery) but does not make
   application-level decisions. Matching logic, pairing preferences, and
   session behavior are determined by client code.
