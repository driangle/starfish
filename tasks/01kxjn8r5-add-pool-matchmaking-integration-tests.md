---
title: "Add pool matchmaking integration tests"
id: "01kxjn8r5"
status: completed
priority: high
type: feature
tags: ["pool", "testing", "integration"]
created_at: "2026-07-15"
dependencies: ["01kxjn8kw", "01kxjn8m7", "01kxjn8mq"]
context:
  - "tests/integration/src/"
  - "protocol/spec/starfish-v0.1.md"
effort: large
phase: v0.1.1
completed_at: 2026-07-16
---

# Add pool matchmaking integration tests

## Objective

Add protocol-level integration tests for the pool matchmaking feature (protocol spec section 7) to `tests/integration/src/pool.test.ts`. These tests run directly against a live server over WebSocket using `StarfishTestClient`, the same pattern used by the existing integration tests in `tests/integration/src/`. They must cover all five matching modes, filter semantics, error codes, member events, pool lifecycle, and resume behavior.

## Background

The existing integration tests in `tests/integration/src/` send raw protocol frames over WebSocket and assert on the frames the server returns. The helpers in `tests/integration/src/helpers/` provide:

- `StarfishTestClient` — wraps a WebSocket connection and exposes `send`, `waitFor`, `waitForType`, `waitForReply`, `hello`, `join`, `drain`, and `close`.
- `frames.ts` — factory functions for common frame types (`helloFrame`, `joinFrame`, etc.). Pool frames will need new factories added here.
- `setup.ts` — exports `SERVER_URL`, `DEFAULT_TIMEOUT`, `SHORT_TIMEOUT`, `uniqueId`, and `uniqueSession`.

Pool frames not yet in `frames.ts` must be added there:
- `poolEnterFrame(pool, opts?)` — builds a `pool.enter` frame.
- `poolLeaveFrame(pool)` — builds a `pool.leave` frame.
- `poolClaimFrame(pool, target)` — builds a `pool.claim` frame.
- `poolAcceptFrame(pool, from)` — builds a `pool.accept` frame.
- `poolRejectFrame(pool, from)` — builds a `pool.reject` frame.
- `poolAssignFrame(pool, groups)` — builds a `pool.assign` frame.

A `uniquePool()` helper should be added to `setup.ts` (same pattern as `uniqueSession()`).

## Tasks

- [x] Add `uniquePool()` to `tests/integration/src/helpers/setup.ts`
- [x] Add pool frame factories to `tests/integration/src/helpers/frames.ts`: `poolEnterFrame`, `poolLeaveFrame`, `poolClaimFrame`, `poolAcceptFrame`, `poolRejectFrame`, `poolAssignFrame`
- [x] Create `tests/integration/src/pool.test.ts` with the test cases below

### Auto mode

- [x] Two clients entering an auto pool are matched in FIFO order and each receive `pool.matched` with the correct `session` and `peers` fields
- [x] Three clients entering an auto pool with `groupSize: 3` are matched together as a group
- [x] Matched clients are removed from the pool (a third client entering after a pair is matched is not paired with the already-matched clients)
- [x] Auto mode with `@self` filter: two clients sharing the same attribute value are matched; a third with a different value is not matched to them
- [x] Auto mode with literal filter: clients are only matched with others who have the specified attribute value
- [x] Filter compatibility: if client A filters on `language: "@self"` and client B has no filter, the match still requires B's `language` attribute to equal A's
- [x] Filter mismatch: clients whose filters are incompatible with each other's attributes are not matched together

### Claim mode

- [x] Entering a claim-mode pool returns `pool.entered` with a `members` array listing existing pool members and their attributes
- [x] A new member joining a claim pool causes existing members to receive `pool.member.joined`
- [x] A successful claim (`pool.claim`) causes both claimer and target to receive `pool.matched` immediately
- [x] Claiming a non-existent target returns a `pool.target_not_found` error
- [x] Sending `pool.claim` in auto mode returns a `pool.mode_mismatch` error

### Mutual mode

- [x] A one-sided claim in mutual mode returns `pool.claim.pending` (not a match)
- [x] When both sides have claimed each other in mutual mode, both receive `pool.matched`
- [x] A member leaving the pool clears their pending claim; the other side does not receive a match

### Propose mode

- [x] Sending `pool.claim` in propose mode delivers `pool.proposal` to the target with the proposer's `from` and `attributes`
- [x] The target accepting (`pool.accept`) causes both sides to receive `pool.matched`
- [x] The target rejecting (`pool.reject`) causes the proposer to receive `pool.claim.rejected`; both remain in the pool

### Delegated mode

- [x] A regular member entering a delegated pool receives `pool.entered` without a member list
- [x] A matchmaker entering a delegated pool (`role: "matchmaker"`) receives `pool.entered`
- [x] When a regular member enters, the matchmaker receives `pool.member.joined`
- [x] The matchmaker sending `pool.assign` with valid groups causes all assigned members to receive `pool.matched` and the matchmaker to receive `pool.assigned`
- [x] Assigning a group where a member is not in the pool returns `pool.target_not_found`
- [x] A non-matchmaker sending `pool.assign` returns `pool.role_required`
- [x] Assigning a group with the wrong size returns `pool.invalid_group`

### Pool lifecycle

- [x] Entering a pool that does not exist with `create: false` returns `pool.not_found`
- [x] A pool is created on the first `pool.enter` with `create: true`
- [x] When the last member leaves, the pool is destroyed; a subsequent `pool.enter` with `create: false` returns `pool.not_found`
- [x] A member that has already been matched receives `pool.already_matched` if they somehow attempt to claim again (or the server silently ignores the second attempt gracefully)

### Member events

- [x] In claim-based modes, a member leaving the pool triggers `pool.member.left` with `reason: "left"` to remaining members
- [x] In delegated mode, a member leaving triggers `pool.member.left` to the matchmaker only (not to other regular members)
- [x] In auto mode, no `pool.member.joined` or `pool.member.left` events are sent when members enter or leave
- [x] After a match in claim-based modes, remaining pool members receive `pool.member.left` with `reason: "matched"` for each matched member

### Resume

- [x] A client that disconnects and reconnects within the resume window retains their pool membership (the server does not emit `pool.member.left` for them during the window)
- [x] After reconnection, the client can still be matched

## Acceptance Criteria

- `tests/integration/src/pool.test.ts` exists and all test cases listed above are implemented
- All five matching modes (`auto`, `claim`, `mutual`, `propose`, `delegated`) have at least one positive-path test
- All six error codes from protocol spec section 7 are covered by at least one test: `pool.not_found`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`
- `pool.matched` payload is asserted to include `pool`, `session` (a non-empty string), and `peers` (array with correct client IDs)
- Tests clean up all clients in `afterEach` (same pattern as other test files)
- Tests pass against both the Go server (`01kxjn8kw`) and the TypeScript server (`01kxjn8m7`)
