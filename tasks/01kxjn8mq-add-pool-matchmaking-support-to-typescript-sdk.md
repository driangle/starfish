---
title: "Add pool matchmaking support to TypeScript SDK"
id: "01kxjn8mq"
status: completed
priority: high
type: feature
tags: ["pool", "sdk", "typescript"]
created_at: "2026-07-15"
dependencies: ["01kxjn8kw", "01kxjn8m7"]
phase: v0.1.1
completed_at: 2026-07-15
---

# Add pool matchmaking support to TypeScript SDK

## Objective

Implement pool matchmaking support in the TypeScript SDK (`sdks/typescript/`) as specified in protocol section 7. Pools are named matchmaking queues that pair clients into sessions. The SDK needs a `Pool` class (following the same module pattern as `Presence`, `Topics`, etc.) exposed via `starfish.pool` on `StarfishClient`.

The API covers three pool modes:
- **Auto** (default): server pairs members automatically; members are invisible to each other.
- **Claim-based** (`claim`, `mutual`, `propose`): members see each other and initiate matching themselves.
- **Delegated**: a matchmaker client controls group assignment; regular members are invisible to each other.

## Tasks

### Pool class (`sdks/typescript/src/pool.ts`)

- [x] Create `Pool` class with a `Connection` and `Session` dependency (mirrors the `Presence` / `Topics` constructor pattern).
- [x] Implement `enter(poolName, options)` — sends `pool.enter` frame and awaits `pool.entered` response. Options: `groupSize`, `mode` (`"auto"` | `"claim"` | `"mutual"` | `"propose"` | `"delegated"`), `role` (`"member"` | `"matchmaker"`), `attributes`, `filter`, `create` (default `true`).
- [x] Implement `leave(poolName)` — sends `pool.leave` frame (fire and forget, no ack needed).
- [x] Implement `claim(poolName, targetId)` — sends `pool.claim` frame (claim/mutual/propose modes only).
- [x] Implement `accept(poolName, fromId)` — sends `pool.accept` frame (propose mode only).
- [x] Implement `reject(poolName, fromId)` — sends `pool.reject` frame (propose mode only).
- [x] Implement `assign(poolName, groups)` — sends `pool.assign` frame (delegated/matchmaker role only). `groups` is `string[][]`.
- [x] Add `members$` — an `Observable<PoolMember[]>` tracking the member list for the current pool. Updated by `pool.member.joined` and `pool.member.left` frames (relevant in claim-based and delegated modes).
- [x] Add `matched$` — an `EventStream<PoolMatchedEvent>` that emits when the client is matched (`pool.matched` frame). Callers use this to know which session to join.
- [x] Implement `handleFrame(frame)` to route incoming pool frames: `pool.entered`, `pool.matched`, `pool.member.joined`, `pool.member.left`, `pool.proposal`, `pool.claim.pending`, `pool.claim.rejected`.
- [x] Add `clear()` to reset `members$` state (called on disconnect/leave).

### Types (`sdks/typescript/src/types.ts`)

- [x] Add `PoolMode` type: `"auto" | "claim" | "mutual" | "propose" | "delegated"`.
- [x] Add `PoolRole` type: `"member" | "matchmaker"`.
- [x] Add `PoolMember` interface: `{ id: string; attributes?: Record<string, unknown> }`.
- [x] Add `PoolEnterOptions` interface: `{ groupSize: number; mode?: PoolMode; role?: PoolRole; attributes?: Record<string, unknown>; filter?: Record<string, string>; create?: boolean }`.
- [x] Add `PoolMatchedEvent` interface: `{ pool: string; session: string; peers: PoolMember[] }`.

### StarfishClient integration (`sdks/typescript/src/client.ts`)

- [x] Instantiate `Pool` in the constructor alongside `Presence`, `Topics`, etc.
- [x] Wire pool frames into `dispatchFrame()` so the `Pool` instance receives them.
- [x] Expose `pool` as a public getter returning the `Pool` instance.

### Exports (`sdks/typescript/src/index.ts`)

- [x] Export `Pool` class.
- [x] Export `PoolMember`, `PoolEnterOptions`, `PoolMatchedEvent`, `PoolMode`, `PoolRole` types.

### Tests (`sdks/typescript/src/pool.test.ts`)

- [x] Test `enter()` sends the correct `pool.enter` frame and resolves with the server response.
- [x] Test `leave()` sends `pool.leave`.
- [x] Test `claim()`, `accept()`, `reject()`, and `assign()` send the correct frames.
- [x] Test `members$` updates correctly on `pool.member.joined` and `pool.member.left` frames.
- [x] Test `matched$` emits on `pool.matched` frame.
- [x] Test that frames for other pools are ignored (pool name scoping).
- [x] Test that calling `enter()` without a session throws `NO_SESSION`.

## Acceptance Criteria

- `starfish.pool.enter("distant-touch", { groupSize: 2 })` resolves after the server confirms with `pool.entered`.
- `starfish.pool.leave("distant-touch")` sends the correct frame.
- `starfish.pool.members$` is an `Observable` that reflects joining/leaving members in claim-based and delegated modes.
- `starfish.pool.matched$` emits a `PoolMatchedEvent` (with `session` and `peers`) when the server sends `pool.matched`.
- Claim-based methods (`claim`, `accept`, `reject`) send the correct protocol frames.
- `starfish.pool.assign("lobby", [["client_a7f3", "client_b912"]])` sends a valid `pool.assign` frame.
- All public types are exported from the package index.
- Unit tests pass for the `Pool` class covering all modes and frame types.
- `Pool` follows the same constructor and `handleFrame` pattern as `Presence` and `Topics`.
