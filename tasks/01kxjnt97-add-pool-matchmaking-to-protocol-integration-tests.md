---
title: "Add pool matchmaking to protocol integration tests against TypeScript server"
id: "01kxjnt97"
status: pending
priority: high
type: feature
tags: ["pool", "testing", "integration", "protocol"]
created_at: "2026-07-15"
dependencies: ["01kxjn8m7"]
---

# Add pool matchmaking to protocol integration tests against TypeScript server

## Objective

Add pool matchmaking coverage to the low-level protocol integration test suite at `tests/integration/`. This suite tests the wire protocol directly using `StarfishTestClient` (raw WebSocket frames via `send`/`waitForReply`/`waitForType`) rather than any SDK. Tests live in `tests/integration/src/` alongside `sessions.test.ts`, `messaging.test.ts`, `errors.test.ts`, etc., and share helpers from `tests/integration/src/helpers/` — `StarfishTestClient` from `client.ts`, frame builders from `frames.ts`, and `uniqueSession`/`uniqueId` from `setup.ts`. This task adds `pool.test.ts` in `tests/integration/src/` with new frame-builder helpers for pool message types, and covers all five pool modes, all member visibility rules, all pool error codes, and pool lifecycle at the raw-frame level against the TypeScript server.

## Tasks

- [ ] Add pool frame-builder helpers to `tests/integration/src/helpers/frames.ts`:
  - `poolEnterFrame(poolName, opts: { create?, mode?, groupSize?, role?, attributes?, filter? })` → `pool.enter` frame
  - `poolLeaveFrame(poolName)` → `pool.leave` frame
  - `poolClaimFrame(poolName, targetId)` → `pool.claim` frame
  - `poolAcceptFrame(poolName, fromId)` → `pool.accept` frame
  - `poolRejectFrame(poolName, fromId)` → `pool.reject` frame
  - `poolAssignFrame(poolName, groups: string[][])` → `pool.assign` frame

- [ ] Create `tests/integration/src/pool.test.ts` following the `describe` / `it` / `afterEach` pattern of `sessions.test.ts` (tracking clients array and closing all after each test).

- [ ] **Auto mode — FIFO pair match**: use `poolEnterFrame` to enter two clients with `mode: "auto"` and `groupSize: 2`; wait for `pool.matched` on both via `waitForType("pool.matched")`; assert both frames carry a non-empty `payload.session` and each other in `payload.peers`.

- [ ] **Auto mode — filter match**: client A sets `attributes: { role: "host" }`, `filter: { role: "guest" }`; client B sets `attributes: { role: "guest" }`, `filter: { role: "host" }`; assert matched; send a third client with incompatible attributes; assert no `pool.matched` arrives for the third client within `SHORT_TIMEOUT`.

- [ ] **Auto mode — filter mismatch blocks match**: two clients with incompatible filters; assert no `pool.matched` within timeout; assert neither receives a `pool.member.joined` frame.

- [ ] **Auto mode — no member events**: while clients wait in auto mode, drain all frames and assert none have type `pool.member.joined`.

- [ ] **Auto mode — `pool.entered` has no members list**: assert the `pool.entered` reply does not include a `payload.members` array (or that it is empty/undefined) for auto-mode pools.

- [ ] **Claim mode — `pool.entered` includes members**: first client enters; second client enters; assert second client's `pool.entered` reply contains `payload.members` with the first client's ID.

- [ ] **Claim mode — `pool.member.joined` broadcast**: when the second client enters a claim-mode pool, assert the first client receives a `pool.member.joined` frame with the second client's ID.

- [ ] **Claim mode — immediate match on `pool.claim`**: first client sends `poolClaimFrame` targeting second client; assert both receive `pool.matched`; assert remaining members (if any) receive `pool.member.left` with `reason: "matched"`.

- [ ] **Mutual mode — `pool.claim.pending` then match**: client A claims B; assert A's reply (or pushed frame) is `pool.claim.pending`; B claims A; assert both receive `pool.matched`.

- [ ] **Propose mode — proposal forwarded**: client A sends `poolClaimFrame` in propose mode targeting B; assert B receives `pool.proposal` frame with A's client ID in `payload.from` and A's attributes.

- [ ] **Propose mode — accept triggers match**: B sends `poolAcceptFrame`; assert both A and B receive `pool.matched`.

- [ ] **Propose mode — reject keeps both in pool**: B sends `poolRejectFrame`; assert A receives `pool.claim.rejected`; assert neither receives `pool.matched`; A can still enter/claim again.

- [ ] **Delegated mode — member events to matchmaker only**: matchmaker-role client and two regular members enter a delegated pool; assert regular members do not receive `pool.member.joined`; assert matchmaker receives `pool.member.joined` for each regular member.

- [ ] **Delegated mode — `pool.assign` fires matches**: matchmaker sends `poolAssignFrame` with a group of two regular members; assert both members receive `pool.matched`; assert matchmaker receives `pool.assigned`; assert matchmaker receives `pool.member.left` with `reason: "matched"` for each matched member.

- [ ] **Delegated mode — non-matchmaker `pool.assign` blocked**: regular member sends `poolAssignFrame`; assert error response with `error.code: "pool.role_required"`.

- [ ] **Error: `pool.not_found`**: send `poolEnterFrame` with `create: false` for a non-existent pool; assert `waitForReply` returns `type: "error"` with `error.code: "pool.not_found"`.

- [ ] **Error: `pool.mode_mismatch`**: enter auto mode pool, then send `poolClaimFrame`; assert `error.code: "pool.mode_mismatch"`.

- [ ] **Error: `pool.target_not_found`**: in claim mode, send `poolClaimFrame` targeting a non-existent client ID; assert `error.code: "pool.target_not_found"`.

- [ ] **Error: `pool.invalid_group`**: in delegated mode, send `poolAssignFrame` with a group whose length differs from `groupSize`; assert `error.code: "pool.invalid_group"`.

- [ ] **Pool lifecycle — destroyed on empty**: single client enters; client sends `poolLeaveFrame`; wait briefly; a second client sends `poolEnterFrame` with `create: false`; assert `error.code: "pool.not_found"`.

- [ ] **`pool.member.left` with `reason: "left"`**: in a claim-mode pool with two members, one sends `poolLeaveFrame`; assert the remaining member receives `pool.member.left` with `payload.reason: "left"`.

## Acceptance Criteria

- All five pool modes have at least one passing test at the raw-frame protocol level against the TypeScript server.
- All seven pool error codes (`pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`) are exercised by dedicated error-path tests.
- Member visibility rules are verified at frame level: auto mode emits no `pool.member.joined`, claim-based modes broadcast to all members, delegated mode sends events to matchmaker only.
- Pool lifecycle (destroyed when last member leaves) is verified by a `pool.not_found` response to a subsequent `create: false` entry.
- All new frame-builder helpers are added to `tests/integration/src/helpers/frames.ts` (not duplicated inline in the test file).
- All tests pass with `vitest run` in `tests/integration/` pointed at a running TypeScript server.
- Test file follows the same `afterEach` cleanup and `SHORT_TIMEOUT` / `DEFAULT_TIMEOUT` patterns as the other files in `tests/integration/src/`.
