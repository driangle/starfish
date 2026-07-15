---
title: "Add pool matchmaking support to Go server"
id: "01kxjn8kw"
status: pending
priority: high
type: feature
tags: ["pool", "server", "golang"]
dependencies: ["01kwyst5m", "01kx4bgce"]
created_at: "2026-07-15"
phase: v0.1.1
---

# Add pool matchmaking support to Go server

## Objective

Implement the pool matchmaking system (protocol spec section 7) in the Go server at `servers/golang/starfish/`. Pools are named matchmaking queues that collect waiting clients and group them into sessions based on a configurable mode. The server enforces all matching rules and guarantees atomic match execution.

The implementation should follow the same patterns established in the existing handler files: a `pool.go` type/state file, a `handler_pool.go` dispatch file, new error codes in `errors.go`, and new message type registrations in `handler.go`. Pool membership must be preserved across reconnection resume windows using the same mechanism as session membership in `resume.go`.

## Tasks

- [ ] Add pool error codes to `errors.go`: `pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`
- [ ] Create `pool.go` with the `Pool` struct, `PoolMember` struct, and pool-level methods (create, add/remove members, FIFO auto-match, filter evaluation, claim tracking, match execution, broadcast helpers)
- [ ] Add pool registry to `Server` in `server.go` (`pools map[string]*Pool`) with `GetPool`, `GetOrCreatePool`, `RemovePool` methods
- [ ] Add pool membership tracking to `Client` in `client.go` (`pools map[string]bool`) so memberships survive resume
- [ ] Add pool membership to `ResumeEntry` in `resume.go` and restore/expire logic (emit `pool.member.left` with `reason: "timeout"` on expiry)
- [ ] Create `handler_pool.go` with handlers for all pool message types:
  - `pool.enter`: validate payload, create or look up pool, add member, send `pool.entered`, broadcast `pool.member.joined` per mode rules, trigger auto-match if applicable
  - `pool.leave`: remove member, send confirmation, broadcast `pool.member.left` with `reason: "left"`, destroy pool if empty
  - `pool.claim`: enforce claim-based mode only; implement `claim` (immediate match), `mutual` (pending until reciprocal, send `pool.claim.pending`), and `propose` (send `pool.proposal` to target; handle `pool.accept`/`pool.reject` responses)
  - `pool.accept`: resolve pending proposal, execute match
  - `pool.reject`: clear pending proposal, send `pool.claim.rejected` to claimer
  - `pool.assign`: delegated mode only, matchmaker-role only; validate groups against `groupSize`, execute matches, send `pool.assigned` to matchmaker
- [ ] Register all pool message types in `handler.go`
- [ ] Implement auto-match FIFO loop in `pool.go`: after each `pool.enter`, scan the waiting queue for the first pair (or group, for `groupSize > 2`) where all bilateral filters are satisfied; execute match atomically
- [ ] Implement filter evaluation: support literal equality and `@self` references; a match requires both members' filters to be satisfied by the other's attributes
- [ ] Implement match execution helper: generate a unique session name, send `pool.matched` to each matched member, remove them from the pool, broadcast `pool.member.left` with `reason: "matched"` per mode visibility rules
- [ ] Write integration tests in `integration_advanced_test.go` covering: auto mode FIFO pair match, auto mode with `@self` filter, claim mode immediate match, mutual mode pending and reciprocal confirm, propose mode accept and reject flows, delegated mode matchmaker assign, resume window preserves pool membership, pool destroyed when last member leaves

## Acceptance Criteria

- `pool.enter` creates a pool on first call with `create: true`; returns `pool.not_found` if pool is absent and `create` is false or omitted
- `pool.entered` response includes member list for claim-based modes; omits it for auto and delegated modes
- Auto mode: server pairs members FIFO respecting bilateral filter constraints; members are invisible to each other (no `pool.member.joined`/`pool.member.left` events)
- Claim-based modes: `pool.member.joined` and `pool.member.left` are broadcast to all pool members; full member list is included in `pool.entered`
- Delegated mode: `pool.member.joined` and `pool.member.left` are sent only to matchmaker-role clients; regular members receive no member events
- `pool.claim` returns `pool.mode_mismatch` in auto or delegated mode
- `pool.assign` returns `pool.role_required` if sender does not have `role: "matchmaker"`, `pool.mode_mismatch` if pool is not delegated, `pool.invalid_group` if a group's size does not match `groupSize` or a referenced client is not a current pool member
- `pool.matched` delivers the session name and peer list (with attributes) to every matched member
- Matched members are removed from the pool; `pool.member.left` with `reason: "matched"` is broadcast per mode visibility rules
- Pool is destroyed when the last member leaves or is matched
- Pool membership is preserved during the reconnection resume window; `pool.member.left` with `reason: "timeout"` fires when the window expires
- Pending claims are cleared when a member leaves, is matched, or times out
- Mode and `groupSize` are immutable after pool creation
- All new error codes are returned in `error` frames following the existing `NewErrorFrame` pattern
