# Starfish Protocol Specification v0.2

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

After connection, the client sends a hello request:

```json
{
  "header": {
    "v": 2,
    "id": "msg_001",
    "resource": "client",
    "method": "hello",
    "kind": "request",
    "ts": 1783440000000
  },
  "payload": {
    "versions": [2],
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

Server replies with a welcome response:

```json
{
  "header": {
    "v": 2,
    "id": "msg_002",
    "resource": "client",
    "method": "welcome",
    "kind": "response",
    "ts": 1783440000010,
    "replyTo": "msg_001"
  },
  "payload": {
    "status": "ok",
    "version": 2,
    "clientId": "client_a7f3",
    "resumeToken": "rt_8f2a1b3c4d5e",
    "resumeTimeout": 30000,
    "serverTime": 1783440000010,
    "heartbeatInterval": 15000,
    "sessionRequired": true,
    "auth": {
      "required": false
    },
    "rtc": {
      "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
      ]
    }
  }
}
```

The `auth.required` field advertises whether the server requires authentication.
See [3.4 Authentication](#34-authentication).

### 3.2 Version Negotiation

The client sends a `versions` array in the hello payload, listing supported
protocol versions in preference order (highest first). The server selects the
highest mutually supported version and includes it as `version` in the welcome
response.

If the server does not support any of the client's listed versions, it responds
with a version error:

```json
{
  "header": {
    "v": 2,
    "id": "err_001",
    "resource": "client",
    "method": "welcome",
    "kind": "response",
    "replyTo": "msg_001"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "protocol.unsupported_version",
      "resource": "client",
      "message": "None of the requested versions are supported.",
      "retry": false
    }
  }
}
```

Once the handshake completes, the negotiated version is implicit for the
connection lifetime. The `v` field MAY be omitted from subsequent frames.
Implementations SHOULD include `v` in the hello/welcome exchange and MAY
omit it from all other frames on that connection.

### 3.3 Reconnection

On WebSocket disconnect, the server holds the client's state (session
memberships, pool memberships, topic subscriptions, presence) for the duration
of `resumeTimeout` (provided in the welcome response). During this window,
other clients see the disconnected client as temporarily offline -- the server
does NOT emit a disconnected event immediately.

**Resuming:** The client sends a hello request with `resumeToken`:

```json
{
  "header": {
    "v": 2,
    "id": "msg_003",
    "resource": "client",
    "method": "hello",
    "kind": "request",
    "ts": 1783440002000
  },
  "payload": {
    "versions": [2],
    "resumeToken": "rt_8f2a1b3c4d5e",
    "capabilities": {
      "rtc": true
    }
  }
}
```

If the token is valid and not expired, the server responds with a welcome
and the original `clientId`. The client's session memberships, pool
memberships, topic subscriptions, and presence are restored:

```json
{
  "header": {
    "v": 2,
    "id": "msg_004",
    "resource": "client",
    "method": "welcome",
    "kind": "response",
    "ts": 1783440002010,
    "replyTo": "msg_003"
  },
  "payload": {
    "status": "ok",
    "version": 2,
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
elapsed, the server responds with a fresh welcome (new `clientId`,
`resumed: false`). The client must re-join sessions, re-enter pools, and
re-subscribe.

**Fresh connection** (no resume): Omit `resumeToken` from the hello payload.
The server assigns a new `clientId` with no prior state.

**RTC peer connections** are always invalidated on disconnect and must be
re-established after reconnection, even on successful resume.

**Timeout behavior:** If the resume window expires without reconnection:

1. The server emits a `session/disconnected` event with reason `"timeout"` to
   all sessions the client was in.
2. The server emits a `pool/member-left` event with reason `"timeout"` to all
   pools the client was in.
3. The client's state is destroyed.
4. The `resumeToken` is invalidated.

### 3.4 Authentication

Authentication is **optional**. A server MAY require clients to present
credentials during the handshake; when it does not, clients connect without
credentials and the flow is identical to earlier revisions (fully backwards
compatible).

#### 3.4.1 The `auth` envelope

The client carries an `auth` object in the `client.hello` payload. It is an
**opaque, extensible envelope** keyed by `type`:

```json
"auth": {
  "type": "token",
  "token": "eyJhbGciOi..."
}
```

- `type` (string, required) identifies the credential scheme. The reserved
  value `"none"` (or an omitted `auth` object) means the client is presenting
  no credentials.
- Additional fields carry the credential for that scheme.

The protocol does **not** prescribe credential schemes beyond `none`. It defines
only the envelope and the handshake flow; the server owns all validation logic.
Two common schemes are documented as conventions:

| `type`          | Fields             | Notes                                             |
| --------------- | ------------------ | ------------------------------------------------- |
| `none`          | —                  | Anonymous. Default when `auth` is omitted.        |
| `token`         | `token` (string)   | Opaque bearer token or JWT.                       |
| `shared-secret` | `secret` (string)  | Pre-shared secret common to all clients.          |

Servers MAY define additional custom `type` values. Clients and servers MUST
ignore auth fields they do not understand rather than failing.

#### 3.4.2 Server requirement and advertisement

The `server.welcome` payload includes an additive `auth` object advertising
whether authentication is required:

```json
"auth": {
  "required": true
}
```

Clients SHOULD treat a missing `auth` object in the welcome as
`{ "required": false }`.

#### 3.4.3 Rejection flow

When a server requires authentication, it validates the client's `auth`
envelope during the fresh-connection handshake (before assigning a `clientId`):

- If the client presents no credentials (`auth` omitted or `type: "none"`), the
  server rejects with `auth.required`.
- If the client presents credentials that fail validation, the server rejects
  with `auth.failed`.

Both rejections are **welcome-response error frames** — the same shape as the
[version-negotiation error](#32-version-negotiation): `resource: "client"`,
`method: "welcome"`, `kind: "response"`, with `payload.status: "error"` and
`retry: false`. A rejected client is not registered and holds no server state.

```json
{
  "header": {
    "v": 2,
    "id": "err_002",
    "resource": "client",
    "method": "welcome",
    "kind": "response",
    "replyTo": "msg_001"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "auth.required",
      "resource": "client",
      "message": "Authentication required.",
      "retry": false
    }
  }
}
```

#### 3.4.4 Reconnection

Resumed connections are **not re-challenged**. The `resumeToken` issued in a
prior welcome is itself a bearer credential scoped to the resume window, so a
hello carrying a valid `resumeToken` bypasses auth validation. Once the resume
window expires, the client must perform a fresh handshake and re-authenticate.

#### 3.4.5 Security requirements

- Credentials travel in the `client.hello` payload; clients and servers MUST use
  a secure transport (`wss://` / TLS) whenever authentication is in use.
- Servers SHOULD compare secrets and tokens using a constant-time comparison to
  avoid timing side channels.
- Servers MUST NOT log credential values.

---

## 4. Canonical Message Envelope

Every Starfish frame uses a two-level envelope: a `header` object containing
protocol metadata, and a `payload` object containing application data.

```typescript
type StarfishFrame = {
  header: StarfishHeader
  payload?: Record<string, unknown>
}

type StarfishHeader = {
  v?: 2
  id: string
  resource: string
  method: string
  kind: "request" | "response" | "event"
  ts?: number
  session?: string
  from?: string
  to?: string | string[]
  topic?: string
  replyTo?: string
  delivery?: Delivery
  priority?: "low" | "normal" | "high" | "critical"
  ttl?: number
  meta?: Record<string, unknown>
}
```

### 4.1 Required Header Fields

All frames MUST include in the header:

| Field      | Description                                          |
| ---------- | ---------------------------------------------------- |
| `id`       | Unique message identifier.                           |
| `resource` | The resource being acted on (e.g. `"session"`, `"topic"`, `"data"`). |
| `method`   | The action or event name (e.g. `"join"`, `"publish"`, `"changed"`). |
| `kind`     | Frame direction: `"request"`, `"response"`, or `"event"`. |

### 4.2 Kind

The `kind` field makes frame direction unambiguous:

| Kind         | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `"request"`  | Client-to-server action. Expects a response.                 |
| `"response"` | Server-to-client reply. Always includes `replyTo`.           |
| `"event"`    | Server-to-client or peer-to-peer notification. No `replyTo`. |

### 4.3 Resource and Method

The `resource` and `method` fields replace the v0.1 `type` field. Together they
identify the operation: `resource` names the entity, `method` names the action.

Resources: `client`, `session`, `topic`, `message`, `presence`, `data`, `pool`,
`rtc`, `heartbeat`, `clock`, `ack`.

The full vocabulary is defined in each section below and summarized in the
migration guide (Section 29).

### 4.4 Version Field

The `v` field indicates the protocol version. It MUST be included in the
hello/welcome handshake. After handshake, `v` is implicit for the connection
lifetime and MAY be omitted from subsequent frames.

### 4.5 Message ID

The `id` field is a client-generated string, unique within that client's
connection. The simplest approach is a monotonic counter (`"1"`, `"2"`, `"3"`).
UUIDs are also acceptable.

Server-generated messages (events, responses) use server-assigned IDs.

IDs are used for:

- Response routing (`replyTo`)
- Deduplication
- Debugging and tracing

### 4.6 Optional Header Fields

| Field      | Description                                                    |
| ---------- | -------------------------------------------------------------- |
| `v`        | Protocol version. Required in handshake, optional after.       |
| `ts`       | Timestamp (milliseconds since epoch).                          |
| `session`  | Session scope for the message.                                 |
| `from`     | Sender client ID. Set by server on delivery.                   |
| `to`       | Recipient client ID(s).                                        |
| `topic`    | Topic name for pub/sub messages.                               |
| `replyTo`  | ID of the request this frame responds to.                      |
| `delivery` | Delivery options (see Section 5).                              |
| `priority` | Message priority: `"low"`, `"normal"`, `"high"`, `"critical"`. |
| `ttl`      | Discard if older than this many milliseconds.                  |
| `meta`     | Open `Record<string, unknown>` for extensible metadata.        |

### 4.7 Header Meta

The `meta` field is an open key-value bag for extensible metadata. Both client
and server may attach arbitrary entries for tracing, debugging, or custom
features without polluting the defined header fields.

Implementations MUST NOT require any specific keys in `meta`. Implementations
MUST ignore unknown `meta` keys.

### 4.8 Payload

The `payload` object contains application-specific data. Its shape depends on
the `resource`/`method` combination and is defined per message type in each
section below.

For responses, `payload` always includes a `status` field: `"ok"` for success
or `"error"` for failure (see Section 19).

Applications MUST place custom data inside `payload`, not in `header`.

### 4.9 Reserved Header Fields

The following header field names are reserved and MUST NOT be used for
application data: `v`, `id`, `resource`, `method`, `kind`, `ts`, `session`,
`from`, `to`, `topic`, `replyTo`, `delivery`, `priority`, `ttl`, `meta`.

---

## 5. Delivery Options

Delivery options are placed in the `header.delivery` field, separate from
application data in `payload`.

```typescript
type Delivery = {
  reliability?: "reliable" | "unreliable" | "latest"
  ordering?: "ordered" | "unordered"
  preferTransport?: "ws" | "rtc" | "auto"
  fallback?: boolean
  includeSelf?: boolean
  requireAck?: boolean
}
```

**Defaults** (applied when `delivery` is omitted):

```json
{
  "reliability": "reliable",
  "ordering": "ordered",
  "preferTransport": "auto",
  "fallback": true
}
```

### 5.1 Delivery Fields

| Field              | Meaning                                                |
| ------------------ | ------------------------------------------------------ |
| `reliability`      | `"reliable"`: message should arrive. `"unreliable"`: may be dropped. `"latest"`: only newest value matters. |
| `ordering`         | `"ordered"`: preserve order within lane. `"unordered"`: allow faster unordered delivery. |
| `preferTransport`  | Preferred transport path.                              |
| `fallback`         | Use WebSocket if RTC path fails.                       |
| `includeSelf`      | Include sender in broadcast delivery. Default `false`. |
| `requireAck`       | Receiver must acknowledge.                             |

### 5.2 Priority and TTL

Priority and TTL are direct header fields, not nested in `delivery`:

| Field      | Meaning                                                |
| ---------- | ------------------------------------------------------ |
| `priority` | Message priority: `"low"`, `"normal"`, `"high"`, `"critical"`. Default `"normal"`. |
| `ttl`      | Discard if older than this many milliseconds.          |

All delivery values are **hints**, not guarantees. Implementations SHOULD honor
them on a best-effort basis.

---

## 6. Sessions

### 6.1 Join Session

Sessions are ephemeral -- they exist as long as at least one client is
connected. When the last client leaves, the server MAY destroy the session
and its associated data.

If the session does not exist, the server returns a `session.not_found` error
unless `create: true` is set in the payload. There is no separate create
request -- creation is an explicit option on join.

```json
{
  "header": {
    "id": "msg_010",
    "resource": "session",
    "method": "join",
    "kind": "request",
    "session": "show-abc"
  },
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
  "header": {
    "id": "msg_011",
    "resource": "session",
    "method": "join",
    "kind": "response",
    "session": "show-abc",
    "replyTo": "msg_010"
  },
  "payload": {
    "status": "ok",
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
  "header": {
    "id": "msg_012",
    "resource": "session",
    "method": "leave",
    "kind": "request",
    "session": "show-abc"
  }
}
```

### 6.3 Session Events

When a client joins:

```json
{
  "header": {
    "id": "evt_001",
    "resource": "session",
    "method": "connected",
    "kind": "event",
    "session": "show-abc"
  },
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
  "header": {
    "id": "evt_002",
    "resource": "session",
    "method": "disconnected",
    "kind": "event",
    "session": "show-abc"
  },
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
  "header": {
    "id": "msg_100",
    "resource": "pool",
    "method": "enter",
    "kind": "request"
  },
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
  "header": {
    "id": "msg_100",
    "resource": "pool",
    "method": "enter",
    "kind": "request"
  },
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
| `create`     | Create the pool if it doesn't exist. Same pattern as session join. |
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
  "header": {
    "id": "msg_101",
    "resource": "pool",
    "method": "enter",
    "kind": "response",
    "replyTo": "msg_100"
  },
  "payload": {
    "status": "ok",
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
  "header": {
    "id": "msg_101",
    "resource": "pool",
    "method": "enter",
    "kind": "response",
    "replyTo": "msg_100"
  },
  "payload": {
    "status": "ok",
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
  "header": {
    "id": "msg_102",
    "resource": "pool",
    "method": "leave",
    "kind": "request"
  },
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
  "header": {
    "id": "evt_100",
    "resource": "pool",
    "method": "member-joined",
    "kind": "event"
  },
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
  "header": {
    "id": "evt_101",
    "resource": "pool",
    "method": "member-left",
    "kind": "event"
  },
  "payload": {
    "pool": "distant-touch",
    "memberId": "client_c441",
    "reason": "left"
  }
}
```

Valid reasons: `"left"`, `"matched"`, `"timeout"`, `"disconnected"`.

### 7.7 Claiming (claim, mutual, propose modes)

Members send a claim request to request a match with a specific target. Claims
are not available in auto or delegated modes.

```json
{
  "header": {
    "id": "msg_110",
    "resource": "pool",
    "method": "claim",
    "kind": "request"
  },
  "payload": {
    "pool": "distant-touch",
    "target": "client_b912"
  }
}
```

Behavior depends on the pool's mode:

**Claim:** The server matches immediately. The target has no say. The
server responds with a `pool/matched` event to both clients.

**Mutual:** The server records the claim. If the target has also claimed the
claimer, the match is confirmed and both receive a `pool/matched` event. If
not yet mutual, the server acknowledges the pending claim:

```json
{
  "header": {
    "id": "msg_111",
    "resource": "pool",
    "method": "claim",
    "kind": "response",
    "replyTo": "msg_110"
  },
  "payload": {
    "status": "pending",
    "pool": "distant-touch",
    "target": "client_b912"
  }
}
```

**Propose:** The target receives a proposal event:

```json
{
  "header": {
    "id": "evt_110",
    "resource": "pool",
    "method": "proposal",
    "kind": "event"
  },
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
  "header": {
    "id": "msg_112",
    "resource": "pool",
    "method": "accept",
    "kind": "request"
  },
  "payload": {
    "pool": "distant-touch",
    "from": "client_a7f3"
  }
}
```

```json
{
  "header": {
    "id": "msg_113",
    "resource": "pool",
    "method": "reject",
    "kind": "request"
  },
  "payload": {
    "pool": "distant-touch",
    "from": "client_a7f3"
  }
}
```

On rejection, the claimer receives:

```json
{
  "header": {
    "id": "evt_111",
    "resource": "pool",
    "method": "claim-rejected",
    "kind": "event"
  },
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
matchmaker receives `pool/member-joined` and `pool/member-left` events
and uses them to make matching decisions.

```json
{
  "header": {
    "id": "msg_120",
    "resource": "pool",
    "method": "assign",
    "kind": "request"
  },
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
  "header": {
    "id": "msg_121",
    "resource": "pool",
    "method": "assign",
    "kind": "response",
    "replyTo": "msg_120"
  },
  "payload": {
    "status": "ok",
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
  "header": {
    "id": "evt_120",
    "resource": "pool",
    "method": "matched",
    "kind": "event"
  },
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

After a match:

1. Matched members are removed from the pool.
2. In claim-based modes, other pool members receive `pool/member-left` with
   `reason: "matched"` for each matched member. In delegated mode, the
   matchmaker receives these events. In auto mode, no events are sent.
3. Matched members are **not** automatically joined to the session. They must
   send a `session/join` request with the provided session name. This gives
   clients time to transition (show a "matched" screen, load assets, etc.).
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
groups in the assign request.

For `groupSize > 2` in `auto` mode, the server collects members until
`groupSize` is reached (respecting filters), then fires the match.

### 7.11 Pool Lifecycle

- A pool is created on the first `pool/enter` request with `create: true`.
- A pool is destroyed when the last member (including matchmakers) leaves.
- Mode and group size are immutable after creation.
- Members that disconnect enter the resume window (same as sessions). If
  they reconnect, their pool membership is restored. If the resume window
  expires, `pool/member-left` fires with `reason: "timeout"`.
- Pending claims are cleared when a member leaves or is matched.

---

## 8. Topic Pub/Sub

### 8.1 Subscribe

```json
{
  "header": {
    "id": "msg_020",
    "resource": "topic",
    "method": "subscribe",
    "kind": "request",
    "session": "show-abc",
    "topic": "lights"
  }
}
```

Response:

```json
{
  "header": {
    "id": "msg_021",
    "resource": "topic",
    "method": "subscribe",
    "kind": "response",
    "session": "show-abc",
    "topic": "lights",
    "replyTo": "msg_020"
  },
  "payload": {
    "status": "ok"
  }
}
```

### 8.2 Unsubscribe

```json
{
  "header": {
    "id": "msg_022",
    "resource": "topic",
    "method": "unsubscribe",
    "kind": "request",
    "session": "show-abc",
    "topic": "lights"
  }
}
```

### 8.3 Publish

```json
{
  "header": {
    "id": "msg_023",
    "resource": "topic",
    "method": "publish",
    "kind": "request",
    "session": "show-abc",
    "topic": "lights",
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
  "header": {
    "id": "msg_023",
    "resource": "topic",
    "method": "message",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "topic": "lights"
  },
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
  "header": {
    "id": "msg_030",
    "resource": "message",
    "method": "send",
    "kind": "request",
    "session": "show-abc",
    "to": "client_b912"
  },
  "payload": {
    "gesture": "freeze"
  }
}
```

Delivered as:

```json
{
  "header": {
    "id": "msg_030",
    "resource": "message",
    "method": "message",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "to": "client_b912"
  },
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
  "header": {
    "id": "msg_040",
    "resource": "session",
    "method": "broadcast",
    "kind": "request",
    "session": "show-abc"
  },
  "payload": {
    "cue": "start"
  }
}
```

To include the sender in delivery, set `includeSelf` in `header.delivery`:

```json
{
  "header": {
    "id": "msg_041",
    "resource": "session",
    "method": "broadcast",
    "kind": "request",
    "session": "show-abc",
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
  "header": {
    "id": "msg_050",
    "resource": "presence",
    "method": "set",
    "kind": "request",
    "session": "show-abc"
  },
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
  "header": {
    "id": "evt_050",
    "resource": "presence",
    "method": "updated",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3"
  },
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
use `topic/publish` with `delivery.reliability: "latest"` instead of presence.

Presence uses WebSocket unless the implementation explicitly opts into RTC
delivery for presence.

---

## 12. Shared Data Operations

Data operations are server-authoritative and MUST use WebSocket.

### 12.1 Save

```json
{
  "header": {
    "id": "msg_060",
    "resource": "data",
    "method": "save",
    "kind": "request",
    "session": "show-abc"
  },
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
  "header": {
    "id": "msg_061",
    "resource": "data",
    "method": "save",
    "kind": "response",
    "session": "show-abc",
    "replyTo": "msg_060"
  },
  "payload": {
    "status": "ok",
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
by the server. It is returned in save responses, get responses, and
data changed events.

**Last-write-wins** (default): omit `expectedVersion`. The server accepts
the write unconditionally.

**Optimistic concurrency**: include `expectedVersion` in the save payload.
The server rejects the write if the key's current version does not match.

```json
{
  "header": {
    "id": "msg_060",
    "resource": "data",
    "method": "save",
    "kind": "request",
    "session": "show-abc"
  },
  "payload": {
    "key": "score",
    "scope": "session",
    "op": "replace",
    "data": 12,
    "expectedVersion": 2
  }
}
```

If the version does not match, the server responds with a conflict error:

```json
{
  "header": {
    "id": "err_060",
    "resource": "data",
    "method": "save",
    "kind": "response",
    "replyTo": "msg_060"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "data.conflict",
      "resource": "data",
      "message": "Version mismatch.",
      "retry": true
    },
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
retry without an extra get round-trip.

For a new key that does not yet exist, use `"expectedVersion": 0`.

### 12.3 Get

```json
{
  "header": {
    "id": "msg_062",
    "resource": "data",
    "method": "get",
    "kind": "request",
    "session": "show-abc"
  },
  "payload": {
    "key": "score",
    "scope": "session"
  }
}
```

Response:

```json
{
  "header": {
    "id": "msg_063",
    "resource": "data",
    "method": "get",
    "kind": "response",
    "session": "show-abc",
    "replyTo": "msg_062"
  },
  "payload": {
    "status": "ok",
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
  "header": {
    "id": "evt_060",
    "resource": "data",
    "method": "changed",
    "kind": "event",
    "session": "show-abc"
  },
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
  "header": {
    "id": "rtc_001",
    "resource": "rtc",
    "method": "connect",
    "kind": "request",
    "session": "show-abc",
    "to": "client_b912"
  },
  "payload": {
    "channels": ["control", "stream", "state"]
  }
}
```

### 14.2 RTC Offer

```json
{
  "header": {
    "id": "rtc_002",
    "resource": "rtc",
    "method": "offer",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "to": "client_b912"
  },
  "payload": {
    "sdp": "..."
  }
}
```

### 14.3 RTC Answer

```json
{
  "header": {
    "id": "rtc_003",
    "resource": "rtc",
    "method": "answer",
    "kind": "event",
    "session": "show-abc",
    "from": "client_b912",
    "to": "client_a7f3"
  },
  "payload": {
    "sdp": "..."
  }
}
```

### 14.4 ICE Candidate

```json
{
  "header": {
    "id": "rtc_004",
    "resource": "rtc",
    "method": "ice",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "to": "client_b912"
  },
  "payload": {
    "candidate": {}
  }
}
```

### 14.5 RTC Connected

```json
{
  "header": {
    "id": "evt_070",
    "resource": "rtc",
    "method": "connected",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "to": "client_b912"
  }
}
```

### 14.6 RTC Disconnected

```json
{
  "header": {
    "id": "evt_071",
    "resource": "rtc",
    "method": "disconnected",
    "kind": "event",
    "session": "show-abc",
    "from": "client_a7f3",
    "to": "client_b912"
  },
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

The client chooses transport based on `header.delivery.preferTransport`.

### 16.1 `preferTransport: "ws"`

Always send through WebSocket.

### 16.2 `preferTransport: "rtc"`

Send through RTC if available. If unavailable:

- If `fallback: true`: send through WebSocket.
- If `fallback: false`: fail with `transport.unavailable` error.

### 16.3 `preferTransport: "auto"`

Recommended default routing:

| Message                                            | Default transport                    |
| -------------------------------------------------- | ------------------------------------ |
| `data/*`                                           | WebSocket only                       |
| `session/*`                                        | WebSocket only                       |
| `pool/*`                                           | WebSocket only                       |
| `presence/*`                                       | WebSocket                            |
| `topic/publish` (reliable)                         | WebSocket                            |
| `topic/publish` (unreliable / latest)              | RTC if peer path exists, else WS     |
| `message/send` (reliable)                          | RTC if connected, else WS            |
| `message/send` (unreliable / latest)               | RTC preferred                        |
| `session/broadcast`                                | WebSocket (unless RTC mesh enabled)  |

---

## 17. Topic Routing over RTC

Topic subscription authority remains server-side. A client may only receive
RTC topic messages for topics it has subscribed to through WebSocket.

**Flow:**

1. Client subscribes via WebSocket.
2. Server records subscription.
3. Server pushes subscription map to peers via `topic/peers`.
4. Publisher delivers topic messages over RTC to peers listed in the map.
5. **Receiver MUST validate** incoming RTC topic messages against its own
   subscription set. Drop unauthorized messages silently.

The subscription map may be stale. This is acceptable -- Starfish uses
**eventual consistency** for RTC topic routing:

- A newly subscribed client may miss messages until the publisher receives
  the updated `topic/peers` event.
- A recently unsubscribed client may receive messages it no longer wants.
  The receiver drops them.

### 17.1 Subscription Map Event

```json
{
  "header": {
    "id": "evt_080",
    "resource": "topic",
    "method": "peers",
    "kind": "event",
    "session": "show-abc",
    "topic": "pose"
  },
  "payload": {
    "subscribers": ["client_b912", "client_c441"]
  }
}
```

---

## 18. Acknowledgements

Any frame may request acknowledgement via `header.delivery.requireAck: true`.

Request:

```json
{
  "header": {
    "id": "msg_090",
    "resource": "message",
    "method": "send",
    "kind": "request",
    "session": "show-abc",
    "to": "client_b912",
    "delivery": {
      "requireAck": true
    }
  },
  "payload": {
    "cue": "go"
  }
}
```

Positive acknowledgement:

```json
{
  "header": {
    "id": "ack_090",
    "resource": "ack",
    "method": "ack",
    "kind": "response",
    "replyTo": "msg_090",
    "session": "show-abc",
    "from": "client_b912"
  },
  "payload": {
    "status": "ok",
    "received": true
  }
}
```

Negative acknowledgement:

```json
{
  "header": {
    "id": "ack_091",
    "resource": "ack",
    "method": "nack",
    "kind": "response",
    "replyTo": "msg_090"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "topic.not_subscribed",
      "resource": "topic",
      "message": "Receiver is not subscribed to topic.",
      "retry": false
    }
  }
}
```

---

## 19. Error Format

All responses include a `status` field in `payload`: `"ok"` for success,
`"error"` for failure.

### 19.1 Structured Error Object

```typescript
type StarfishError = {
  code: string
  resource: string
  message: string
  retry: boolean
}
```

Error response:

```json
{
  "header": {
    "id": "err_001",
    "resource": "session",
    "method": "join",
    "kind": "response",
    "replyTo": "msg_001"
  },
  "payload": {
    "status": "error",
    "error": {
      "code": "session.not_found",
      "resource": "session",
      "message": "Session does not exist.",
      "retry": false
    }
  }
}
```

The `error.resource` field identifies which resource produced the error. The
`error.retry` field hints whether the client should retry the request.

Error responses may include an additional `details` field in `payload` with
operation-specific context (e.g. `currentData` for conflict errors).

### 19.2 Error Codes

| Code                           | Resource  | Retry | Description                               |
| ------------------------------ | --------- | ----- | ----------------------------------------- |
| `auth.required`                | `client`  | false | Authentication required.                  |
| `auth.failed`                  | `client`  | false | Authentication failed.                    |
| `session.not_found`            | `session` | false | Session does not exist.                   |
| `session.full`                 | `session` | true  | Session is at capacity.                   |
| `client.not_found`             | `message` | false | Target client not found.                  |
| `topic.invalid`                | `topic`   | false | Invalid topic name.                       |
| `topic.not_subscribed`         | `topic`   | false | Client not subscribed to topic.           |
| `transport.unavailable`        | `rtc`     | true  | Requested transport not available.        |
| `rtc.failed`                   | `rtc`     | true  | RTC connection failed.                    |
| `data.invalid_op`              | `data`    | false | Invalid data operation.                   |
| `data.conflict`                | `data`    | true  | Version mismatch (optimistic concurrency).|
| `data.forbidden`               | `data`    | false | Not authorized for data operation.        |
| `pool.not_found`               | `pool`    | false | Pool does not exist.                      |
| `pool.not_member`              | `pool`    | false | Client is not in this pool.               |
| `pool.target_not_found`        | `pool`    | false | Claim target is not in the pool.          |
| `pool.already_matched`         | `pool`    | false | Target was already matched.               |
| `pool.mode_mismatch`           | `pool`    | false | Operation not allowed in this pool mode.  |
| `pool.role_required`           | `pool`    | false | Operation requires matchmaker role.       |
| `pool.invalid_group`           | `pool`    | false | Group does not match pool's group size.   |
| `rate_limited`                 | (varies)  | true  | Client is sending too fast.               |
| `payload.too_large`            | (varies)  | false | Payload exceeds size limit.               |
| `protocol.invalid_frame`       | (varies)  | false | Malformed frame.                          |
| `protocol.unsupported_version` | `client`  | false | Unsupported protocol version.             |
| `resume.invalid`               | `client`  | false | Resume token is invalid.                  |
| `resume.expired`               | `client`  | false | Resume token has expired.                 |
| `internal_error`               | (varies)  | true  | Server internal error.                    |

---

## 20. Heartbeats

Starfish uses application-level heartbeats (not WebSocket ping frames) for
visibility across both transports and to enable latency measurement.

WebSocket heartbeat:

```json
{
  "header": {
    "id": "ping_001",
    "resource": "heartbeat",
    "method": "ping",
    "kind": "request",
    "ts": 1783440000000
  }
}
```

Response:

```json
{
  "header": {
    "id": "pong_001",
    "resource": "heartbeat",
    "method": "pong",
    "kind": "response",
    "replyTo": "ping_001",
    "ts": 1783440000010
  },
  "payload": {
    "status": "ok"
  }
}
```

The heartbeat interval is provided by the server in the welcome response.
If a client misses heartbeats for 2x the interval, the server SHOULD consider
the client disconnected.

RTC peers MAY send heartbeats over the control channel using the same format.

---

## 21. Clock Sync

Server time sync is part of the WebSocket control plane.

Request:

```json
{
  "header": {
    "id": "clock_001",
    "resource": "clock",
    "method": "sync",
    "kind": "request",
    "ts": 1783440000000
  }
}
```

Response:

```json
{
  "header": {
    "id": "clock_002",
    "resource": "clock",
    "method": "sync",
    "kind": "response",
    "replyTo": "clock_001"
  },
  "payload": {
    "status": "ok",
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
starfish.events$({ resource: "session", method: "connected" })
starfish.events$({ topic: "lights" })
starfish.events$({ from: "client_a7f3" })
```

### 22.1 Event Types

| Resource    | Method          | Trigger                              |
| ----------- | --------------- | ------------------------------------ |
| `session`   | `connected`     | Client joined session.               |
| `session`   | `disconnected`  | Client left or timed out.            |
| `session`   | `join`          | This client joined a session (response). |
| `topic`     | `subscribe`     | Subscription confirmed (response).   |
| `topic`     | `message`       | Topic message received.              |
| `topic`     | `peers`         | Subscription map updated.            |
| `message`   | `message`       | Direct message received.             |
| `presence`  | `updated`       | Client presence changed.             |
| `data`      | `changed`       | Shared data value changed.           |
| `pool`      | `enter`         | This client entered a pool (response). |
| `pool`      | `member-joined` | Member entered the pool.             |
| `pool`      | `member-left`   | Member left the pool.                |
| `pool`      | `matched`       | This client was matched.             |
| `pool`      | `proposal`      | Received a match proposal.           |
| `pool`      | `claim`         | Claim recorded, awaiting mutual (response). |
| `pool`      | `claim-rejected`| Proposal was rejected by target.     |
| `pool`      | `assign`        | Matchmaker: assignment confirmed (response). |
| `rtc`       | `connected`     | RTC peer connection established.     |
| `rtc`       | `disconnected`  | RTC peer connection lost.            |
| `ack`       | `ack`           | Positive acknowledgement.            |
| `ack`       | `nack`          | Negative acknowledgement.            |

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

// Pools (auto mode -- the common case)
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
starfish.messages$                    // all incoming direct messages
starfish.messagesFrom$("client_b912") // messages from a specific peer

// Broadcast
starfish.broadcast({ cue: "start" }, { includeSelf: false })

// Shared data
await starfish.save({ key: "score", data: 12, op: "replace", scope: "session" })
const score = await starfish.get({ key: "score", scope: "session" })

// Presence
starfish.presence.set({ role: "dancer", color: "red", x: 0.4, y: 0.8 })
starfish.presence$   // Observable of all presence

// Observables
starfish.clients$            // current client list
starfish.peers$              // other clients in session
starfish.messages$           // incoming direct messages
starfish.events$(filter)     // filtered event stream

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
7. Servers MAY require authentication via the handshake `auth` envelope
   ([3.4 Authentication](#34-authentication)), rejecting unauthenticated clients
   with `auth.required` / `auth.failed`. Credentials MUST be validated in
   constant time, sent over TLS, and never logged.
8. Pool claims and assignments are server-authoritative. The server validates
   that targets are current pool members before executing any match.
9. In delegated pool mode, only clients with `role: "matchmaker"` may send
   `pool/assign`. The server MUST reject `pool/assign` from non-matchmaker
   clients. The server MUST reject `pool/claim` from any client in an auto
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

v0.2 is JSON-first. Binary support is deferred to a future version.

Applications needing binary transport in v0.2 should use a reference pattern:

```json
{
  "header": {
    "id": "bin_001",
    "resource": "topic",
    "method": "publish",
    "kind": "request",
    "topic": "video-frame"
  },
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

The protocol version is the `v` field in the header. Current version: `2`.

Version negotiation occurs during the handshake. The client sends `versions`
(an array of supported versions, highest first) in the hello payload. The
server selects the highest mutually supported version and returns it as
`version` in the welcome payload.

After the handshake, the negotiated version is implicit for the connection
lifetime. Frames MAY omit the `v` field.

If no common version exists, the server responds with a
`protocol.unsupported_version` error and closes the connection.

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

6. **Explicit direction.** The `kind` field makes every frame's direction
   unambiguous. Requests expect responses. Events are fire-and-forget
   notifications.

7. **Structured errors.** Every error response includes a machine-readable
   code, the resource that produced it, a human-readable message, and a
   retry hint.

---

## 29. Migration Guide: v0.1 to v0.2

### 29.1 Envelope Change

**v0.1:** Flat structure with all fields at the top level.

```json
{
  "v": 1,
  "id": "msg_001",
  "type": "session.join",
  "session": "show-abc",
  "payload": { ... }
}
```

**v0.2:** Two-level envelope with `header` and `payload`.

```json
{
  "header": {
    "id": "msg_001",
    "resource": "session",
    "method": "join",
    "kind": "request",
    "session": "show-abc"
  },
  "payload": { ... }
}
```

### 29.2 Type Field Mapping

The v0.1 `type` field is replaced by `resource`, `method`, and `kind` in v0.2.

| v0.1 `type`            | v0.2 `resource` | v0.2 `method`   | v0.2 `kind`  |
| ---------------------- | --------------- | --------------- | ------------ |
| `client.hello`         | `client`        | `hello`         | `request`    |
| `server.welcome`       | `client`        | `welcome`       | `response`   |
| `session.join`         | `session`       | `join`          | `request`    |
| `session.joined`       | `session`       | `join`          | `response`   |
| `session.leave`        | `session`       | `leave`         | `request`    |
| `session.broadcast`    | `session`       | `broadcast`     | `request`    |
| `client.connected`     | `session`       | `connected`     | `event`      |
| `client.disconnected`  | `session`       | `disconnected`  | `event`      |
| `topic.subscribe`      | `topic`         | `subscribe`     | `request`    |
| `topic.subscribed`     | `topic`         | `subscribe`     | `response`   |
| `topic.unsubscribe`    | `topic`         | `unsubscribe`   | `request`    |
| `topic.publish`        | `topic`         | `publish`       | `request`    |
| `topic.message`        | `topic`         | `message`       | `event`      |
| `topic.peers`          | `topic`         | `peers`         | `event`      |
| `client.send`          | `message`       | `send`          | `request`    |
| `client.message`       | `message`       | `message`       | `event`      |
| `presence.set`         | `presence`      | `set`           | `request`    |
| `presence.updated`     | `presence`      | `updated`       | `event`      |
| `data.save`            | `data`          | `save`          | `request`    |
| `data.saved`           | `data`          | `save`          | `response`   |
| `data.get`             | `data`          | `get`           | `request`    |
| `data.value`           | `data`          | `get`           | `response`   |
| `data.changed`         | `data`          | `changed`       | `event`      |
| `pool.enter`           | `pool`          | `enter`         | `request`    |
| `pool.entered`         | `pool`          | `enter`         | `response`   |
| `pool.leave`           | `pool`          | `leave`         | `request`    |
| `pool.claim`           | `pool`          | `claim`         | `request`    |
| `pool.claim.pending`   | `pool`          | `claim`         | `response`   |
| `pool.claim.rejected`  | `pool`          | `claim-rejected`| `event`      |
| `pool.accept`          | `pool`          | `accept`        | `request`    |
| `pool.reject`          | `pool`          | `reject`        | `request`    |
| `pool.proposal`        | `pool`          | `proposal`      | `event`      |
| `pool.assign`          | `pool`          | `assign`        | `request`    |
| `pool.assigned`        | `pool`          | `assign`        | `response`   |
| `pool.matched`         | `pool`          | `matched`       | `event`      |
| `pool.member.joined`   | `pool`          | `member-joined` | `event`      |
| `pool.member.left`     | `pool`          | `member-left`   | `event`      |
| `rtc.connect`          | `rtc`           | `connect`       | `request`    |
| `rtc.offer`            | `rtc`           | `offer`         | `event`      |
| `rtc.answer`           | `rtc`           | `answer`        | `event`      |
| `rtc.ice`              | `rtc`           | `ice`           | `event`      |
| `rtc.connected`        | `rtc`           | `connected`     | `event`      |
| `rtc.disconnected`     | `rtc`           | `disconnected`  | `event`      |
| `ping`                 | `heartbeat`     | `ping`          | `request`    |
| `pong`                 | `heartbeat`     | `pong`          | `response`   |
| `clock.sync`           | `clock`         | `sync`          | `request`    |
| `clock.synced`         | `clock`         | `sync`          | `response`   |
| `ack`                  | `ack`           | `ack`           | `response`   |
| `nack`                 | `ack`           | `nack`          | `response`   |
| `error`                | (original)      | (original)      | `response`   |

### 29.3 Options Moved to Header

v0.1 `options` fields move to the header:

| v0.1                       | v0.2                       |
| -------------------------- | -------------------------- |
| `options.delivery`         | `header.delivery`          |
| `options.priority`         | `header.priority`          |
| `options.ttl`              | `header.ttl`               |
| `options.requireAck`       | `header.delivery.requireAck` |

### 29.4 Version Negotiation

v0.1 required both sides to agree on `v: 1` with no negotiation.

v0.2 introduces negotiation: the client sends `versions: [2]` in the hello
payload. The server responds with `version: 2` in the welcome payload. After
handshake, `v` is implicit.

### 29.5 Error Responses

v0.1 used `type: "error"` with a flat error object.

v0.2 uses the standard response envelope with `status: "error"` in payload
and a structured error object with `code`, `resource`, `message`, and `retry`
fields.

| v0.1                          | v0.2                              |
| ----------------------------- | --------------------------------- |
| `type: "error"`               | `kind: "response"`, `payload.status: "error"` |
| `error.code`                  | `payload.error.code`              |
| `error.message`               | `payload.error.message`           |
| `error.details`               | `payload.details`                 |
| (not present)                 | `payload.error.resource`          |
| (not present)                 | `payload.error.retry`             |

### 29.6 Response Format

v0.1 responses used distinct type names (e.g. `session.joined`, `data.saved`).

v0.2 responses reuse the request's `resource` and `method` with
`kind: "response"` and include `payload.status: "ok"` or
`payload.status: "error"`.

### 29.7 Reserved Fields

v0.1 reserved fields: `v`, `id`, `type`, `ts`, `session`, `from`, `to`,
`topic`, `ack`, `replyTo`, `transport`, `options`, `payload`, `error`.

v0.2 reserved header fields: `v`, `id`, `resource`, `method`, `kind`, `ts`,
`session`, `from`, `to`, `topic`, `replyTo`, `delivery`, `priority`, `ttl`,
`meta`.

Removed from top level: `type`, `ack`, `transport`, `options`, `error`.
Added: `resource`, `method`, `kind`, `delivery`, `priority`, `ttl`, `meta`.
