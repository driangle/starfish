---
title: "Add pool matchmaking tests to Python SDK × Go server integration suite"
id: "01kxjnt7x"
status: pending
priority: high
type: feature
tags: ["pool", "testing", "integration", "python", "golang"]
created_at: "2026-07-15"
dependencies: ["01kxjn8kw", "01kxjn8nt"]
---

# Add pool matchmaking tests to Python SDK × Go server integration suite

## Objective

Add pool matchmaking test coverage to the existing Python SDK × Go server integration suite at `sdks/python/integration/`. The existing suite tests sessions, messaging, presence, topics, and data using `StarfishClient` from `sdks/python/starfish/` against a live Go server. Each feature has its own test file (`test_session.py`, `test_messaging.py`, etc.) under a `pytest.mark.asyncio` class, sharing `create_client` and `unique_session` helpers from `conftest.py`. This task adds `test_pool.py` in that directory, covering all five pool modes, member visibility rules, all pool error codes, and pool lifecycle — the same scope as the protocol spec section 7.

## Tasks

- [ ] Create `sdks/python/integration/test_pool.py` following the pattern of `test_session.py` and `test_messaging.py`: `from __future__ import annotations`, `import asyncio`, `import pytest`, use `@pytest.mark.asyncio` class, and `from .conftest import create_client, unique_session`.

- [ ] **Auto mode — FIFO pair match**: two clients enter the same pool with `mode="auto"` and `group_size=2` via `pool_enter`; register listeners on `pool_matched` event stream on each; assert both eventually receive a `PoolMatchResult` with a non-empty `session` and each other in `peers`.

- [ ] **Auto mode — filter match**: client A sets `attributes={"role": "host"}` and `filter={"role": "guest"}`; client B sets `attributes={"role": "guest"}` and `filter={"role": "host"}`; assert they are matched; a third client with mismatching attributes enters; assert it is not matched.

- [ ] **Auto mode — filter mismatch blocks match**: two clients with incompatible filters enter; assert neither `pool_matched` fires within a short timeout; assert no `pool.member.joined` events are emitted (auto mode has no member visibility).

- [ ] **Auto mode — member invisibility**: while two clients wait in an auto-mode pool, assert that `pool_members(pool_name)` observable never emits `pool.member.joined` for the other member.

- [ ] **Claim mode — immediate match**: two clients enter with `mode="claim"`; assert the `PoolEnteredResult` for the second joiner includes `members` with the first client; first client calls `pool_claim(pool_name, target_id)`; assert both clients' `pool_matched` streams emit with a matching `session`.

- [ ] **Claim mode — member visibility**: after the second client enters, listen on the first client's `pool_members` observable; assert the update fires with the second client's ID (via `pool.member.joined`); after a match, assert remaining members see a `pool.member.left` update with `reason="matched"`.

- [ ] **Mutual mode — pending then matched**: client A calls `pool_claim`; assert A's event stream receives `pool.claim.pending` (no immediate match); B calls `pool_claim` for A; assert both receive `pool_matched`.

- [ ] **Propose mode — accept flow**: client A claims client B in a propose-mode pool; use a `pool.proposal` event listener on B to capture the proposal; B calls `pool_accept(pool_name, client_a_id)`; assert both receive `pool_matched`.

- [ ] **Propose mode — reject flow**: A proposes to B; B calls `pool_reject(pool_name, client_a_id)`; assert A receives `pool.claim.rejected`; assert both remain in the pool (`pool_matched` does not fire for either).

- [ ] **Delegated mode — matchmaker assigns**: a matchmaker client (`role="matchmaker"`) and two regular members enter a delegated pool; assert regular members do not receive `pool.member.joined` events; assert matchmaker's `pool_members` observable updates; matchmaker calls `pool_assign(pool_name, [[member_a_id, member_b_id]])`; assert both members receive `pool_matched`; assert matchmaker receives `pool.assigned`.

- [ ] **Delegated mode — non-matchmaker blocked**: a regular member calls `pool_assign`; assert the call raises or the Go server returns `pool.role_required`.

- [ ] **Error: `pool.not_found`**: call `pool_enter` with `create=False` on a non-existent pool; assert `RuntimeError` is raised (as specified in the Python SDK task).

- [ ] **Error: `pool.mode_mismatch`**: enter an auto-mode pool, then call `pool_claim`; assert the Go server returns `pool.mode_mismatch`.

- [ ] **Error: `pool.target_not_found`**: in claim mode, call `pool_claim(pool_name, "nonexistent-id")`; assert `pool.target_not_found` is returned.

- [ ] **Error: `pool.invalid_group`**: in delegated mode, call `pool_assign` with a group whose size does not match `group_size`; assert `pool.invalid_group` is returned.

- [ ] **Pool lifecycle — destroyed when last member leaves**: one client enters a pool; that client calls `pool_leave`; a second client attempts `pool_enter` with `create=False`; assert `RuntimeError` is raised (pool destroyed on empty).

- [ ] **Resume window preserves membership**: disconnect a client in a claim-mode pool without leaving; reconnect within the resume window; assert the client is still present in the pool for other members; if the window expires, assert `pool.member.left` fires with `reason="timeout"`.

## Acceptance Criteria

- All five pool modes have at least one happy-path test passing against the Go server.
- All seven pool error codes (`pool.not_found`, `pool.not_member`, `pool.target_not_found`, `pool.already_matched`, `pool.mode_mismatch`, `pool.role_required`, `pool.invalid_group`) are covered by at least one test each.
- Auto-mode member invisibility is verified.
- Claim-based mode member visibility is verified (`pool_members` observable updates and `pool.member.left` fires with the correct reason).
- Delegated mode member events are visible only to the matchmaker-role client.
- Pool lifecycle test confirms the pool is destroyed when the last member leaves.
- All tests pass with `pytest sdks/python/integration/` pointed at a running Go server.
- Test file follows the same module layout, `@pytest.mark.asyncio` class pattern, and `asyncio.wait_for` timeout guards used by the other files in `sdks/python/integration/`.
