# Changelog

## 0.2.0

### Breaking Changes

This release updates the SDK to implement the Starfish Protocol v0.2
specification. All changes are backward-incompatible with v0.1.

#### Frame envelope restructured

All frames now use a two-level `header`/`payload` envelope instead of a flat
structure.

```typescript
// Before (v0.1)
{ v: 1, id: "msg_1", type: "session.join", session: "room", payload: { ... } }

// After (v0.2)
{
  header: { id: "msg_1", resource: "session", method: "join", kind: "request", session: "room" },
  payload: { ... }
}
```

#### `type` field replaced by `resource`, `method`, and `kind`

The single `type` string (e.g. `"session.join"`) is replaced by three
structured fields in `header`:

- `resource` -- the entity (`"session"`, `"topic"`, `"message"`, `"data"`,
  `"pool"`, `"presence"`, `"rtc"`, `"heartbeat"`, `"clock"`)
- `method` -- the action (`"join"`, `"publish"`, `"send"`, etc.)
- `kind` -- the direction (`"request"`, `"response"`, `"event"`)

See Section 29 of the protocol spec for the full type mapping table.

#### `FrameOptions` removed, replaced by `HeaderOptions`

Delivery options, priority, and TTL have moved from a nested `options` object
into direct `header` fields:

```typescript
// Before (v0.1)
{ options: { delivery: { reliability: "unreliable" }, priority: "high", ttl: 5000 } }

// After (v0.2)
{ header: { delivery: { reliability: "unreliable" }, priority: "high", ttl: 5000 } }
```

The public API methods (`publish`, `send`, `broadcast`) now accept
`HeaderOptions` instead of `FrameOptions`. `requireAck` moved from
`FrameOptions` into `DeliveryOptions`.

#### `StarfishError` updated with `resource` and `retry` fields

```typescript
// Before
new StarfishError(code, message, details?)

// After
new StarfishError(code, message, resource?, retry?, details?)
```

Error responses now use structured format: `payload.status === "error"` with
`payload.error` containing `code`, `resource`, `message`, and `retry` fields.

#### Version negotiation added

The client hello now sends `versions: [2]` in the payload. The server responds
with `version: 2` in the welcome payload. After handshake, the `v` field is
implicit and may be omitted.

#### `EventFilter` updated

The `type` field in `EventFilter` is replaced by `resource` and `method`.

#### `meta` field added to header

`StarfishHeader` includes an optional `meta: Record<string, unknown>` field
for extensible metadata. `HeaderOptions` supports `meta` for outgoing frames.

#### Removed fields

- `StarfishFrame.v` -- now optional in `header.v`, only used during handshake
- `StarfishFrame.type` -- replaced by `header.resource`/`method`/`kind`
- `StarfishFrame.ack` -- removed
- `StarfishFrame.transport` -- removed from the type
- `StarfishFrame.options` -- replaced by header-level fields
- `StarfishFrame.error` -- errors are now in `payload`

#### New exports

- `StarfishHeader` -- the header type for the new envelope
- `HeaderOptions` -- replaces `FrameOptions` for public API methods
