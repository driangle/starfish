# Pool Matchmaking API

Pools are named matchmaking queues. Clients enter a pool, the server pairs them into
groups atomically, and each matched client receives a server-generated session name via
a `matched` event. Matched clients are **not** auto-joined — they call `join()` with the
returned session name themselves.

For conceptual background and end-to-end flows, see the
[Pool Matchmaking workflow](../guide/workflows#pool-matchmaking) and the
[Pools section of Core Concepts](../guide/core-concepts#pools).

Pools use WebSocket only — pool frames are never sent over RTC.

## Pool Modes

The mode is fixed when the pool is created and is immutable for the pool's lifetime.

| Mode | Who matches | Members visible | Relevant methods |
|------|-------------|-----------------|------------------|
| `auto` | Server (FIFO, respects `filter`) | No | `enter`, `matched$` |
| `claim` | Any member (first claim wins) | Yes | `enter`, `members$`, `claim`, `matched$` |
| `mutual` | Both members (each must claim the other) | Yes | `enter`, `members$`, `claim`, `claimRejected$`, `matched$` |
| `propose` | One proposes, the other accepts/rejects | Yes | `enter`, `proposal$`, `accept`, `reject`, `matched$` |
| `delegated` | A `matchmaker`-role client via `assign()` | Matchmaker only | `enter` (role: matchmaker), `members$`, `assign`, `matched$` |

## TypeScript API — `Pool` class

Access the pool interface through `client.pool` (a `Pool` instance). Defined in
`sdks/typescript/src/pool.ts`; types in `sdks/typescript/src/pool-types.ts`.

| Member | Signature | Description |
|--------|-----------|-------------|
| `enter` | `enter(poolName: string, options: PoolEnterOptions): Promise<StarfishFrame>` | Enter the named pool. Resolves with the `enter` response frame. In claim-based modes, seeds `members$` with the current member list. |
| `leave` | `leave(poolName: string): void` | Leave the pool and clear local state (fire-and-forget). |
| `claim` | `claim(poolName: string, targetId: string): void` | Claim a specific member (claim and mutual modes). |
| `accept` | `accept(poolName: string, fromId: string): void` | Accept a proposal (propose mode). |
| `reject` | `reject(poolName: string, fromId: string): void` | Reject a proposal (propose mode). |
| `assign` | `assign(poolName: string, groups: string[][]): Promise<StarfishFrame>` | Matchmaker only — assign groups (delegated mode). Resolves with the `assign` response frame. |
| `members$` | `Observable<PoolMember[]>` | Live member list, updated by `member-joined` / `member-left` events. |
| `matched$` | `EventStream<PoolMatchedEvent>` | Fires when the server matches you; carries `pool`, `session`, and `peers`. |
| `proposal$` | `EventStream<{ pool: string; from: string; attributes?: Record<string, unknown> }>` | Fires when a peer proposes a match (propose mode). |
| `claimRejected$` | `EventStream<{ pool: string; target: string }>` | Fires when a claim you made is rejected (mutual mode). |

## Python API — `StarfishClient` pool methods

The Python SDK exposes pool methods directly on `StarfishClient`. Defined in
`sdks/python/starfish/client.py`, backed by `sdks/python/starfish/pool.py`.

| Method | Signature | Description |
|--------|-----------|-------------|
| `pool_enter` | `async pool_enter(options: PoolEnterOptions) -> PoolEnteredResult` | Enter the pool. Raises `RuntimeError` on a `pool.not_found` error. |
| `pool_leave` | `async pool_leave(pool: str) -> None` | Leave the pool (fire-and-forget). |
| `pool_claim` | `async pool_claim(pool: str, target: str) -> None` | Claim a specific member (claim and mutual modes). |
| `pool_accept` | `async pool_accept(pool: str, from_: str) -> None` | Accept a proposal (propose mode). |
| `pool_reject` | `async pool_reject(pool: str, from_: str) -> None` | Reject a proposal (propose mode). |
| `pool_assign` | `async pool_assign(pool: str, groups: list[list[str]]) -> StarfishFrame` | Matchmaker only — assign groups (delegated mode). |
| `pool_members` | `pool_members(pool: str) -> Observable[list[PoolMember]]` | Per-pool observable, updated by `member-joined` / `member-left` events. |
| `pool_matched` | `pool_matched -> EventStream[PoolMatchResult]` (property) | Fires when the server matches you. |

> The Python SDK surfaces the `matched` and member-list events. Proposal and
> claim-rejected events (`propose` and `mutual` modes) are received by the server-side
> handlers but are not currently exposed as Python observables.

## Types

### TypeScript

```ts
type PoolMode = "auto" | "claim" | "mutual" | "propose" | "delegated";
type PoolRole = "member" | "matchmaker";

interface PoolEnterOptions {
  groupSize: number;
  mode?: PoolMode;                        // default: "auto"
  role?: PoolRole;                        // default: "member"
  attributes?: Record<string, unknown>;
  filter?: Record<string, string>;
  create?: boolean;                       // omitted → not created; send true to create
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

`enter()` and `assign()` resolve with the raw `StarfishFrame` response; read
`response.payload` for `status`, `mode`, `groupSize`, and (claim-based modes) `members`.

### Python

```python
@dataclass
class PoolEnterOptions:
    pool: str
    create: bool = True                  # Python default: True
    mode: str = "auto"                   # "auto" | "claim" | "mutual" | "propose" | "delegated"
    group_size: int = 2
    role: str | None = None              # "member" | "matchmaker"
    attributes: dict | None = None
    filter: dict | None = None

@dataclass
class PoolMember:
    id: str
    attributes: dict = field(default_factory=dict)

@dataclass
class PoolMatchResult:
    pool: str
    session: str
    peers: list[PoolMember]

@dataclass
class PoolEnteredResult:
    pool: str
    mode: str
    group_size: int
    members: list[PoolMember] = field(default_factory=list)
```

> **`create` default differs by SDK.** In TypeScript, `create` is optional and the pool
> is only created when you pass `create: true`. In Python, `PoolEnterOptions.create`
> defaults to `True`.

## Protocol Message Types

Wire-level frames, all with `resource: "pool"`. Request/response pairs share a `method`
and are distinguished by `kind` (`request` vs `response`); events use `kind: "event"`.

| Method | Kind | Direction | Description |
|--------|------|-----------|-------------|
| `enter` | request | client → server | Enter a pool |
| `enter` | response | server → client | Acknowledgement; includes the current member list in claim-based modes |
| `leave` | request | client → server | Leave a pool (no response) |
| `claim` | request | client → server | Claim a specific member (claim/mutual modes) |
| `claim` | response | server → client | Pending acknowledgement (mutual mode, before the match completes) |
| `accept` | request | client → server | Accept a proposal (propose mode) |
| `reject` | request | client → server | Reject a proposal (propose mode) |
| `assign` | request | client → server | Matchmaker assigns groups (delegated mode) |
| `assign` | response | server → client | Confirmation with the matched groups and their session names |
| `matched` | event | server → client | Match fired; carries the `session` name and `peers` list |
| `member-joined` | event | server → client | A member entered the pool (visible members / matchmaker only) |
| `member-left` | event | server → client | A member left (carries `memberId` and `reason`) |
| `proposal` | event | server → client | A peer proposed a match (propose mode) |
| `claim-rejected` | event | server → client | A claim was rejected (mutual mode) |

`member-left` reasons: `"left"`, `"matched"`, `"timeout"`, `"disconnected"`.

### `enter` payload fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pool` | string | yes | Pool name |
| `groupSize` | number | yes | Clients per match group (used only on creation) |
| `create` | boolean | no | Create the pool if it does not exist |
| `mode` | string | no | Matchmaking mode (default `"auto"`; used only on creation) |
| `role` | string | no | `"member"` (default) or `"matchmaker"` (delegated mode) |
| `attributes` | object | no | Opaque member metadata; available to filters and visible members |
| `filter` | object | no | Attribute constraints for auto mode; literal values or `"@self"` |

## Error Codes

| Code | Raised by | Description |
|------|-----------|-------------|
| `pool.not_found` | `enter` | The pool does not exist and `create` was false or omitted. Python raises `RuntimeError`. |
| `pool.mode_mismatch` | `enter`, `claim`, `assign` | Operation not allowed in this pool's mode (e.g. `role: "matchmaker"` outside delegated mode, or `claim` in auto mode) |
| `NO_SESSION` | all pool methods (TypeScript) | Called before `client.join()` — a `StarfishError` is thrown |
