---
title: "Add pool matchmaking support to Python SDK"
id: "01kxjn8nt"
status: completed
priority: high
type: feature
tags: ["pool", "sdk", "python"]
dependencies: ["01kxjn8kw", "01kxjn8m7"]
created_at: "2026-07-15"
phase: v0.1.1
completed_at: 2026-07-15
---

# Add pool matchmaking support to Python SDK

## Objective

Implement pool matchmaking in the Python SDK (`sdks/python/`) so that Python clients can enter named matchmaking queues, wait to be paired with other members, and receive session assignments when a match fires. The implementation must cover all five pool modes defined in protocol spec section 7: `auto`, `claim`, `mutual`, `propose`, and `delegated`.

## Background

Pools are named matchmaking queues that pair clients into sessions (spec §7). The server handles match execution atomically. Clients enter a pool, optionally supply attributes and a filter, and wait for a `pool.matched` event that delivers a server-generated session name. Matched clients are not joined to the session automatically — they must call `session.join` afterwards.

Pool messages use WebSocket only and follow the same request/response pattern already established by the SDK's `Connection.send_and_wait()` helper.

## Module

Create `sdks/python/starfish/pool.py` following the single-responsibility pattern of existing modules such as `presence.py`, `data.py`, and `session.py`. Wire it into `StarfishClient` in `client.py` the same way those modules are wired.

## Tasks

- [x] Add pool-related dataclasses to `sdks/python/starfish/pool.py`:
  - `PoolEnterOptions` — `pool`, `create`, `mode`, `group_size`, `role`, `attributes`, `filter`
  - `PoolMember` — `id`, `attributes`
  - `PoolMatchResult` — `pool`, `session`, `peers` (list of `PoolMember`)
  - `PoolEnteredResult` — `pool`, `mode`, `group_size`, `members` (list of `PoolMember`, populated in claim-based modes)
- [x] Implement `Pool` class in `sdks/python/starfish/pool.py`:
  - `async enter(options: PoolEnterOptions) -> PoolEnteredResult` — sends `pool.enter`, waits for `pool.entered`, raises `RuntimeError` on `pool.not_found` error
  - `async leave(pool: str) -> None` — sends `pool.leave` (fire-and-forget)
  - `async claim(pool: str, target: str) -> None` — sends `pool.claim` (claim/mutual/propose modes)
  - `async accept(pool: str, from_: str) -> None` — sends `pool.accept` (propose mode)
  - `async reject(pool: str, from_: str) -> None` — sends `pool.reject` (propose mode)
  - `async assign(pool: str, groups: list[list[str]]) -> StarfishFrame` — sends `pool.assign`, waits for `pool.assigned` (delegated/matchmaker role)
  - `members(pool: str) -> Observable[list[PoolMember]]` — returns a per-pool observable kept up to date via `pool.member.joined` / `pool.member.left` events (useful for claim-based modes)
  - `matched` — `EventStream[PoolMatchResult]` that fires whenever `pool.matched` arrives
  - `handle_frame(frame: StarfishFrame) -> None` — dispatches incoming pool frames to update `members` observables and emit `matched`
- [x] Wire `Pool` into `StarfishClient`:
  - Instantiate `self._pool = Pool(self._connection)` in `__init__`
  - Call `self._pool.handle_frame(frame)` inside `_handle_frame`
  - Expose pool methods as top-level `StarfishClient` methods: `pool_enter`, `pool_leave`, `pool_claim`, `pool_accept`, `pool_reject`, `pool_assign`, `pool_members`, and `pool_matched` property
- [x] Write unit tests in `sdks/python/tests/` covering:
  - `enter` in auto mode (minimal payload, no members in response)
  - `enter` in claim mode (response includes member list, `members()` observable populated)
  - `leave` sends correct frame
  - `claim`, `accept`, `reject` send correct frames
  - `assign` sends correct frame and parses `pool.assigned` response
  - `pool.matched` event fires `matched` stream with correct `PoolMatchResult`
  - `members()` observable updates on `pool.member.joined` and `pool.member.left`
  - `enter` raises on `pool.not_found` error response

## Acceptance Criteria

- `StarfishClient` exposes `pool_enter`, `pool_leave`, `pool_claim`, `pool_accept`, `pool_reject`, `pool_assign`, `pool_members`, and `pool_matched` with correct types
- `pool_enter` with `create=True` and `mode="auto"` sends a `pool.enter` frame with only the required fields (`pool`, `create`, `groupSize`) and returns a `PoolEnteredResult`
- `pool_enter` with `mode="claim"` returns `PoolEnteredResult` with `members` populated from the server response
- `pool_members(pool)` returns an `Observable[list[PoolMember]]` that updates in real time as `pool.member.joined` / `pool.member.left` frames arrive
- `pool_matched` is an `EventStream[PoolMatchResult]` that emits whenever `pool.matched` arrives, with `session` and `peers` correctly parsed
- `pool_assign` is only usable by matchmaker-role clients and returns the raw `pool.assigned` frame
- `pool_enter` raises `RuntimeError` when the server returns a `pool.not_found` error
- Filter dict passed to `pool_enter` is forwarded as-is in the `pool.enter` payload (supports literal values and `"@self"` references)
- All unit tests pass (`pytest sdks/python/`)
- No new dependencies are introduced beyond the existing SDK stack
