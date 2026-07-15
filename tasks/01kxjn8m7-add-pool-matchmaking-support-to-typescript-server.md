---
title: "Add pool matchmaking support to TypeScript server"
id: "01kxjn8m7"
status: completed
priority: high
type: feature
tags: ["pool", "server", "typescript"]
created_at: "2026-07-15"
phase: v0.1.1
completed_at: 2026-07-15
---

# Add pool matchmaking support to TypeScript server

## Objective

Implement the pool matchmaking protocol (section 7 of `protocol/spec/starfish-v0.1.md`) in the TypeScript server at `servers/typescript/`. Pools are named matchmaking queues that collect waiting clients and group them into sessions. The server supports five matching modes (`auto`, `claim`, `mutual`, `propose`, `delegated`) with different visibility and control rules.

## Background

The existing server at `servers/typescript/src/` follows a handler-per-feature pattern:

- Each feature lives in a dedicated handler file (e.g., `handler_topic.ts`, `handler_rtc.ts`, `handler_presence.ts`).
- Handlers export named functions (`handleX`) that take `(hub: StarfishServer, client: Client, frame: StarfishFrame)`.
- `handler.ts` registers routes by wiring handler functions into the `Handler` dispatcher.
- `starfish_server.ts` is the central registry for clients, sessions, and server-wide state.
- `session.ts` encapsulates per-session state (clients, topics, presence, data).
- `errors.ts` defines error code constants and `createErrorFrame`.
- `limits.ts` defines server-wide size/count limits.

## Tasks

### Data Model

- [x] Create `servers/typescript/src/pool.ts` — `Pool` class encapsulating all pool state:
  - Fields: `name`, `mode`, `groupSize`, `members: Map<clientId, PoolMember>` (role, attributes, filter, pending claims)
  - Auto-mode FIFO queue (ordered list of member IDs for matching)
  - Claim state for claim/mutual/propose modes (pending claims, pending proposals)
  - Helper methods: `addMember`, `removeMember`, `getMembers`, `getMember`, `isMatchmaker`, `getMemberList` (for claim-based member list responses), `tryAutoMatch` (FIFO + filter evaluation), `evaluateFilter` (resolve `@self` references and equality matching)
  - Match execution: `executeMatch(group: string[])` — returns a server-generated session name, removes matched members from the pool, returns list of members to notify

- [x] Add `pools: Map<string, Pool>` to `StarfishServer` in `servers/typescript/src/starfish_server.ts` with `getPool`, `getOrCreatePool`, and `removePool` methods (mirrors the existing `sessions` pattern)

- [x] Add pool error constants to `servers/typescript/src/errors.ts`:
  - `ERR_POOL_NOT_FOUND = "pool.not_found"`
  - `ERR_POOL_NOT_MEMBER = "pool.not_member"`
  - `ERR_POOL_TARGET_NOT_FOUND = "pool.target_not_found"`
  - `ERR_POOL_ALREADY_MATCHED = "pool.already_matched"`
  - `ERR_POOL_MODE_MISMATCH = "pool.mode_mismatch"`
  - `ERR_POOL_ROLE_REQUIRED = "pool.role_required"`
  - `ERR_POOL_INVALID_GROUP = "pool.invalid_group"`
  - Add corresponding human-readable messages to the `errorMessages` map

### Pool Entry and Exit

- [x] Create `servers/typescript/src/handler_pool.ts` — implement all pool message handlers:
  - `handlePoolEnter(hub, client, frame)` — validate payload (`pool`, `create`, `mode`, `groupSize`, `role`, `attributes`, `filter`); create pool if `create: true` else error `pool.not_found`; add member; send `pool.entered` response (with `members` list in claim-based modes); broadcast `pool.member.joined` to existing members/matchmakers; trigger `tryAutoMatch` after entry in auto mode
  - `handlePoolLeave(hub, client, frame)` — validate membership; remove member; broadcast `pool.member.left` with `reason: "left"` to relevant observers; destroy pool if empty

### Member Visibility Events

- [x] In `handlePoolEnter` and `handlePoolLeave`: broadcast `pool.member.joined` / `pool.member.left` events to the right audience per mode:
  - Auto mode: no member events
  - Claim-based modes (`claim`, `mutual`, `propose`): broadcast to all current members
  - Delegated mode: broadcast to matchmaker-role members only

### Auto Mode Matching

- [x] In `pool.ts`, implement `tryAutoMatch(hub)` — after each `pool.enter` in auto mode, scan the FIFO queue for a pair (or group of `groupSize`) whose filters are mutually satisfied; call `executeMatch` and send `pool.matched` to all matched members; no member-left events are sent in auto mode

- [x] Implement filter evaluation in `pool.ts`:
  - Resolve `@self` references against the evaluating member's own attributes
  - Equality-check resolved value against target's attributes
  - A missing attribute on the target fails the filter
  - Both members' filters must pass for a match to proceed

### Claim-Based Matching

- [x] Implement `handlePoolClaim(hub, client, frame)` in `handler_pool.ts`:
  - Validate mode is `claim`, `mutual`, or `propose` (else `pool.mode_mismatch`)
  - Validate target exists in pool (else `pool.target_not_found`)
  - **Claim mode:** immediately call `executeMatch([claimer, target])`; send `pool.matched` to both; broadcast `pool.member.left` with `reason: "matched"` for each matched member to remaining pool members
  - **Mutual mode:** record claim; if target has already claimed claimer, execute match; otherwise respond `pool.claim.pending`
  - **Propose mode:** forward `pool.proposal` to target (including claimer's attributes); record pending proposal

- [x] Implement `handlePoolAccept(hub, client, frame)` — validate pending proposal exists; call `executeMatch`; send `pool.matched`; broadcast `pool.member.left` with `reason: "matched"` to remaining members

- [x] Implement `handlePoolReject(hub, client, frame)` — validate pending proposal exists; clear proposal; send `pool.claim.rejected` to original proposer; both remain in pool

### Delegated Mode

- [x] Implement `handlePoolAssign(hub, client, frame)` in `handler_pool.ts`:
  - Validate client has `role: "matchmaker"` in the pool (else `pool.role_required`)
  - Validate pool mode is `delegated` (else `pool.mode_mismatch`)
  - For each group in `payload.groups`: validate all member IDs exist in pool (else `pool.target_not_found`) and group length equals `groupSize` (else `pool.invalid_group`)
  - Execute all groups atomically; send `pool.matched` to each group's members; send `pool.assigned` confirmation to matchmaker; broadcast `pool.member.left` with `reason: "matched"` to matchmaker for each matched member

### Reconnection / Resume

- [x] When a client disconnects, preserve their pool memberships during the resume window (same pattern as session membership in `resume.ts`). On reconnect, restore pool membership. If the resume window expires without reconnection, remove the member from all pools and broadcast `pool.member.left` with `reason: "timeout"` to the appropriate audience.

### Route Registration

- [x] Register all pool handlers in `servers/typescript/src/handler.ts` under `requireAuth`:
  - `pool.enter` → `handlePoolEnter`
  - `pool.leave` → `handlePoolLeave`
  - `pool.claim` → `handlePoolClaim`
  - `pool.accept` → `handlePoolAccept`
  - `pool.reject` → `handlePoolReject`
  - `pool.assign` → `handlePoolAssign`

### Tests

- [x] Create `servers/typescript/src/handler_pool.test.ts` covering:
  - Auto mode: enter, FIFO match fires when `groupSize` reached, filter matching and filter failures
  - Claim mode: immediate match on claim
  - Mutual mode: pending claim, match fires when both sides claim
  - Propose mode: proposal sent, accept triggers match, reject sends `pool.claim.rejected`
  - Delegated mode: matchmaker sees member events, `pool.assign` fires matches, non-matchmaker gets `pool.role_required`
  - Error paths: `pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.mode_mismatch`, `pool.invalid_group`
  - Pool lifecycle: destroyed when last member leaves
  - Member visibility: claim-based modes share member list, auto/delegated do not

## Acceptance Criteria

- `pool.enter` with `create: true` creates the pool on first call; subsequent enters reuse it with the existing mode and groupSize
- `pool.enter` without `create: true` on a nonexistent pool returns `pool.not_found`
- Auto mode: server matches members FIFO; members have no visibility into each other; filters are evaluated bidirectionally; match fires exactly when `groupSize` compatible members are present
- Claim mode: first `pool.claim` immediately matches claimer and target; both receive `pool.matched`; remaining members receive `pool.member.left` with `reason: "matched"`
- Mutual mode: `pool.claim` from one side returns `pool.claim.pending`; when target also claims back, both receive `pool.matched`
- Propose mode: `pool.claim` sends `pool.proposal` to target; target `pool.accept` triggers match; target `pool.reject` sends `pool.claim.rejected` to proposer and both remain in pool
- Delegated mode: regular members receive no member events; matchmaker receives `pool.member.joined`/`pool.member.left`; only matchmaker can send `pool.assign`; non-matchmaker gets `pool.role_required`
- `pool.assign` validates group sizes match `groupSize`; invalid groups return `pool.invalid_group`
- `pool.matched` is sent to every matched member with the server-generated session name and peer list; the session is not auto-joined
- Pool is destroyed when the last member (including matchmakers) leaves
- All new pool error codes (`pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`) are defined in `errors.ts` and returned correctly
- All handler files follow the single-responsibility pattern matching existing handlers (`handler_topic.ts`, `handler_rtc.ts`, etc.)
- Tests cover happy paths for all five modes and all error paths listed above
