---
title: "Add pool matchmaking to API reference documentation"
id: "01kxkvkw3"
status: completed
priority: medium
type: feature
tags: ["pool", "docs", "reference"]
dependencies: ["01kxjn8mq"]
created_at: "2026-07-15"
completed_at: 2026-07-21
---

# Add pool matchmaking to API reference documentation

## Objective

Document the full pool matchmaking API in `docs/reference/` so developers have a precise, scannable reference for every method, type, observable, and protocol message type involved in pool matchmaking. The reference must cover both the TypeScript and Python SDKs.

## Background

The TypeScript SDK exposes pool via `client.pool` (a `Pool` instance defined in `sdks/typescript/src/pool.ts`). Types live in `sdks/typescript/src/pool-types.ts`. The Python SDK exposes pool methods directly on `StarfishClient` (see `sdks/python/starfish/client.py`) with the internal `Pool` class in `sdks/python/starfish/pool.py`.

The reference currently lives at `docs/reference/index.md`, which is a placeholder. This task adds concrete pool content there (or in a new `pool.md` file alongside it, updating `index.md` to link to it).

## Tasks

- [x] Create `docs/reference/pool.md` with the following sections:

  ### Overview
  - One-paragraph description: pools are named matchmaking queues; clients enter, the server pairs them atomically, and the resulting session name is delivered via `pool.matched`
  - Link to the Pool Matchmaking section of the user guide for conceptual background

  ### Pool Modes

  Document each mode in a table:

  | Mode | Description | Relevant methods |
  |------|-------------|-----------------|
  | `auto` | Server pairs clients automatically when `groupSize` is reached | `enter`, `matched$` |
  | `claim` | Clients see the member list and explicitly pick a partner | `enter`, `members$`, `claim`, `matched$` |
  | `mutual` | Both sides must claim each other before a match fires | `enter`, `members$`, `claim`, `matched$` |
  | `propose` | One side proposes; the other accepts or rejects | `enter`, `proposal$`, `accept`, `reject`, `matched$` |
  | `delegated` | A matchmaker client calls `assign()` to form groups | `enter` (role: matchmaker), `members$`, `assign`, `matched$` |

  ### TypeScript API — `Pool` class

  Document the `client.pool` property and all `Pool` methods with signatures and descriptions:

  - `enter(poolName: string, options: PoolEnterOptions): Promise<StarfishFrame>` — enters the named pool, returns the `pool.entered` frame; initialises `members$` with any existing members (claim/mutual/delegated modes)
  - `leave(poolName: string): void` — sends `pool.leave` and clears local state (fire-and-forget)
  - `claim(poolName: string, targetId: string): void` — sends `pool.claim` (claim and mutual modes)
  - `accept(poolName: string, fromId: string): void` — sends `pool.accept` in response to a proposal (propose mode)
  - `reject(poolName: string, fromId: string): void` — sends `pool.reject` in response to a proposal (propose mode)
  - `assign(poolName: string, groups: string[][]): Promise<StarfishFrame>` — matchmaker only; sends `pool.assign` and waits for `pool.assigned`
  - `members$: Observable<PoolMember[]>` — live list of members currently in the pool (updated by `pool.member.joined` / `pool.member.left`)
  - `matched$: EventStream<PoolMatchedEvent>` — fires when the server sends `pool.matched`; contains `pool`, `session`, and `peers`
  - `proposal$: EventStream<{ pool, from, attributes? }>` — fires when a peer proposes a match in propose mode
  - `claimRejected$: EventStream<{ pool, target }>` — fires when a claim is rejected in mutual mode

  ### Python API — `StarfishClient` pool methods

  Document each method with its Python signature and description:

  - `pool_enter(options: PoolEnterOptions) -> PoolEnteredResult` (async) — enters the pool; raises `RuntimeError` on `pool.not_found`
  - `pool_leave(pool: str) -> None` (async) — sends `pool.leave` (fire-and-forget)
  - `pool_claim(pool: str, target: str) -> None` (async) — sends `pool.claim`
  - `pool_accept(pool: str, from_: str) -> None` (async) — sends `pool.accept`
  - `pool_reject(pool: str, from_: str) -> None` (async) — sends `pool.reject`
  - `pool_assign(pool: str, groups: list[list[str]]) -> StarfishFrame` (async) — sends `pool.assign`, awaits `pool.assigned`
  - `pool_members(pool: str) -> Observable[list[PoolMember]]` — per-pool observable, updated by join/leave events
  - `pool_matched: EventStream[PoolMatchResult]` (property) — fires on `pool.matched`

  ### Types

  #### TypeScript

  ```ts
  type PoolMode = "auto" | "claim" | "mutual" | "propose" | "delegated";
  type PoolRole = "member" | "matchmaker";

  interface PoolEnterOptions {
    groupSize: number;
    mode?: PoolMode;         // default: "auto"
    role?: PoolRole;         // default: "member"
    attributes?: Record<string, unknown>;
    filter?: Record<string, string>;
    create?: boolean;        // default: true
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

  #### Python

  ```python
  @dataclass
  class PoolEnterOptions:
      pool: str
      create: bool = True
      mode: str = "auto"       # "auto" | "claim" | "mutual" | "propose" | "delegated"
      group_size: int = 2
      role: str | None = None  # "member" | "matchmaker"
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

  ### Protocol Message Types

  Document the wire-level frames used by pool matchmaking (WebSocket only):

  | Type | Direction | Description |
  |------|-----------|-------------|
  | `pool.enter` | client → server | Enter a pool |
  | `pool.entered` | server → client | Acknowledgement; includes current member list for claim-based modes |
  | `pool.leave` | client → server | Leave a pool (no response) |
  | `pool.claim` | client → server | Claim a specific member (claim/mutual modes) |
  | `pool.accept` | client → server | Accept a proposal (propose mode) |
  | `pool.reject` | client → server | Reject a proposal (propose mode) |
  | `pool.assign` | client → server | Matchmaker assigns groups (delegated mode) |
  | `pool.assigned` | server → client | Confirmation that `pool.assign` was accepted |
  | `pool.matched` | server → client | Match fired; contains `session` name and `peers` list |
  | `pool.member.joined` | server → client | A new member entered the pool (broadcast to existing members) |
  | `pool.member.left` | server → client | A member left the pool (broadcast to remaining members) |
  | `pool.proposal` | server → client | A peer proposed a match (propose mode) |
  | `pool.claim.rejected` | server → client | A claim was rejected (mutual mode) |

  Document `pool.enter` payload fields:

  | Field | Type | Required | Description |
  |-------|------|----------|-------------|
  | `pool` | string | yes | Pool name |
  | `groupSize` | number | yes | Number of clients per match group |
  | `create` | boolean | no | Create pool if it does not exist (default: true) |
  | `mode` | string | no | Matchmaking mode (default: "auto") |
  | `role` | string | no | "member" or "matchmaker" (default: "member") |
  | `attributes` | object | no | Client attributes available to filters |
  | `filter` | object | no | Attribute constraints; literal values or "@self" |

  ### Error Codes

  | Code | Thrown by | Description |
  |------|-----------|-------------|
  | `pool.not_found` | `enter` | The named pool does not exist and `create` was false |
  | `NO_SESSION` | all pool methods (TS) | Called before `client.join()` |

- [x] Update `docs/reference/index.md` to link to the new `pool.md` file

## Acceptance Criteria

- `docs/reference/pool.md` exists and documents all five modes, all TypeScript and Python methods, all types, and all protocol message types
- TypeScript method signatures match `sdks/typescript/src/pool.ts` and `pool-types.ts` exactly
- Python method signatures match `sdks/python/starfish/client.py` and `pool.py` exactly
- Protocol message types table is complete (all 13 frame types listed above)
- `docs/reference/index.md` links to `pool.md`
- No content is fabricated — every API item documented exists in the implemented SDK code
