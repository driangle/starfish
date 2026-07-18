---
title: "Add pool matchmaking tests to TypeScript SDK × TypeScript server integration suite"
id: "01kxjnt6z"
status: pending
priority: medium
type: feature
tags: ["pool", "testing", "integration", "typescript"]
created_at: "2026-07-15"
dependencies: ["01kxjn8m7", "01kxjn8mq"]
---

# Add pool matchmaking tests to TypeScript SDK × TypeScript server integration suite

## Objective

Add pool matchmaking test coverage to the existing TypeScript SDK × TypeScript server integration suite at `sdks/typescript/integration/`. The existing suite tests session, messaging, presence, topics, and data features using the `StarfishClient` SDK against a live TypeScript server. This task adds a new `pool.test.ts` file in that directory, covering all five pool modes (`auto`, `claim`, `mutual`, `propose`, `delegated`), member visibility rules, all pool error codes, and pool lifecycle. Tests use the same `createClient` / `uniqueSession` helpers from `setup.ts` and follow the `describe` / `it` / `afterEach` cleanup pattern used by `session.test.ts`, `messaging.test.ts`, and the other files in that suite.

## Tasks

- [ ] Create `sdks/typescript/integration/pool.test.ts` following the pattern of `session.test.ts` — import `createClient` and `uniqueSession` from `./setup.js`, use `vitest` `describe`/`it`/`expect`/`afterEach`, and track all clients for cleanup.

- [ ] **Auto mode — FIFO pair match**: two clients enter the same pool with `mode: "auto"` and `groupSize: 2`; assert both receive `pool.matched` on `matched$` with a non-empty `session` string and each other listed in `peers`.

- [ ] **Auto mode — filter match**: client A sets `attributes: { role: "host" }` and `filter: { role: "guest" }`; client B sets `attributes: { role: "guest" }` and `filter: { role: "host" }`; assert they are matched; add a third client with a non-matching attribute and assert it is not matched with either.

- [ ] **Auto mode — filter mismatch blocks match**: enter two clients whose filters are mutually incompatible; assert neither `matched$` emits within the timeout; assert neither receives `pool.member.joined` (auto mode has no member visibility).

- [ ] **Auto mode — member invisibility**: while waiting for a match in auto mode, assert that `members$` on each client never emits `pool.member.joined` events for other pool members.

- [ ] **Claim mode — immediate match**: two clients enter a pool with `mode: "claim"`; assert `pool.entered` response includes the initial member list (`members$` is non-empty for the second joiner); first client calls `starfish.pool.claim(poolName, targetId)`; assert both receive `pool.matched` via `matched$`.

- [ ] **Claim mode — member visibility**: after the second client enters a claim-mode pool, assert that the first client's `members$` updates to include the second client (via `pool.member.joined`); after a match, assert remaining members see `pool.member.left` with `reason: "matched"`.

- [ ] **Mutual mode — pending then matched**: client A claims client B; assert `matched$` does not emit yet; verify A receives `pool.claim.pending` (no immediate match); client B claims client A back; assert both receive `pool.matched` via `matched$`.

- [ ] **Propose mode — accept flow**: client A calls `claim(poolName, clientBId)` in propose mode; assert client B's event listener receives `pool.proposal` with A's `clientId` and attributes; client B calls `accept(poolName, clientAId)`; assert both receive `pool.matched`.

- [ ] **Propose mode — reject flow**: client A proposes to client B; client B calls `reject(poolName, clientAId)`; assert client A receives `pool.claim.rejected`; assert both clients remain in the pool (neither `matched$` emits and both are still listed in `members$`).

- [ ] **Delegated mode — matchmaker assigns**: a matchmaker client (`role: "matchmaker"`) and two regular members enter a delegated pool; assert only the matchmaker's `members$` receives `pool.member.joined` events; matchmaker calls `assign(poolName, [[memberA, memberB]])`; assert both members receive `pool.matched`; assert matchmaker receives `pool.assigned`.

- [ ] **Delegated mode — non-matchmaker blocked**: a regular member in a delegated pool calls `assign(...)`; assert the SDK rejects the call or the server returns `pool.role_required`.

- [ ] **Error: `pool.not_found`**: call `enter(poolName, { create: false })` on a pool that does not exist; assert the promise rejects or the SDK surfaces an error with code `pool.not_found`.

- [ ] **Error: `pool.mode_mismatch`**: enter an auto-mode pool, then call `claim(...)`; assert the server returns `pool.mode_mismatch`.

- [ ] **Error: `pool.target_not_found`**: in claim mode, call `claim(poolName, "nonexistent-client-id")`; assert the server returns `pool.target_not_found`.

- [ ] **Error: `pool.invalid_group`**: in delegated mode, have the matchmaker call `assign` with a group whose size does not equal `groupSize`; assert `pool.invalid_group` is returned.

- [ ] **Pool lifecycle — destroyed when last member leaves**: one client enters a pool; that client calls `leave(poolName)`; a second client then attempts `enter(poolName, { create: false })`; assert `pool.not_found` is returned (pool was destroyed on empty).

- [ ] **Resume window preserves membership** (optional, if resume tests exist in the suite): disconnect a client in a claim-mode pool without leaving; reconnect within the resume window; assert the client is still listed in `members$` for other pool members; if the window expires, assert `pool.member.left` fires with `reason: "timeout"`.

## Acceptance Criteria

- All five pool modes (`auto`, `claim`, `mutual`, `propose`, `delegated`) have at least one happy-path test that passes end-to-end against the TypeScript server.
- All seven pool error codes (`pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`) are covered by at least one test each.
- Auto-mode member invisibility is verified (no `pool.member.joined` emitted to waiting clients).
- Claim-based mode member visibility is verified (`members$` updates on join and `pool.member.left` fires with `reason: "matched"` or `"left"` after changes).
- Delegated mode member events are visible only to the matchmaker-role client.
- Pool lifecycle test confirms the pool is destroyed when the last member leaves.
- All tests pass with `vitest run` in `sdks/typescript/integration/` pointed at a running TypeScript server.
- Test file follows the same import, cleanup (`afterEach` disconnect), and naming conventions as the other files in `sdks/typescript/integration/`.
