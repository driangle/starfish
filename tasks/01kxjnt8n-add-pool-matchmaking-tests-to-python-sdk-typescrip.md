---
title: "Add pool matchmaking tests to Python SDK × TypeScript server integration suite"
id: "01kxjnt8n"
status: pending
priority: high
type: feature
tags: ["pool", "testing", "integration", "python", "typescript"]
created_at: "2026-07-15"
dependencies: ["01kxjn8m7", "01kxjn8nt"]
---

# Add pool matchmaking tests to Python SDK × TypeScript server integration suite

## Objective

Add pool matchmaking test coverage to the Python SDK integration suite (`sdks/python/integration/`) running against the TypeScript server instead of the Go server. The test file structure, helpers, and conventions are identical to those in task `01kxjnt7x` (Python SDK × Go server), since the Python SDK is server-agnostic and the same `conftest.py` `SERVER_URL` environment variable selects the target. This task produces a `test_pool.py` (or runs the same file via a separate pytest configuration / CI matrix job) verified specifically against the TypeScript server. Any TypeScript-server-specific behavioral differences from the Go server (e.g., different error message text, timing) must be accounted for.

## Tasks

- [ ] If `test_pool.py` was already created by task `01kxjnt7x`, verify it passes without modification against the TypeScript server by running `pytest sdks/python/integration/test_pool.py` with `STARFISH_SERVER_URL` pointing at the TypeScript server. Fix any assertion mismatches caused by server-specific behavior.

- [ ] If `test_pool.py` does not yet exist, create it following the exact same structure as task `01kxjnt7x` — same `@pytest.mark.asyncio` class, same `create_client` / `unique_session` helpers from `conftest.py`, same test cases listed below.

- [ ] **Auto mode — FIFO pair match**: two clients enter with `mode="auto"` and `group_size=2`; assert both receive `pool_matched` with a valid `session` and each other in `peers`.

- [ ] **Auto mode — filter match**: bilateral `attributes` / `filter` combination results in a match; a third client with incompatible attributes is not matched.

- [ ] **Auto mode — filter mismatch blocks match**: assert neither `pool_matched` fires and no `pool.member.joined` is emitted while incompatible clients wait.

- [ ] **Auto mode — member invisibility**: `pool_members` observable never updates in auto mode.

- [ ] **Claim mode — immediate match**: two clients in claim mode; second joiner sees member list in `PoolEnteredResult`; first client claims second; both receive `pool_matched`.

- [ ] **Claim mode — member visibility**: `pool_members` observable updates when the second client enters; after match, remaining members receive `pool.member.left` with `reason="matched"`.

- [ ] **Mutual mode — pending then matched**: first claim returns `pool.claim.pending`; second reciprocal claim triggers `pool_matched` on both sides.

- [ ] **Propose mode — accept flow**: proposal is forwarded to target; `pool_accept` triggers `pool_matched` for both participants.

- [ ] **Propose mode — reject flow**: `pool_reject` sends `pool.claim.rejected` to proposer; neither participant is matched; both remain in the pool.

- [ ] **Delegated mode — matchmaker assigns**: matchmaker-role client sees member events; `pool_assign` sends `pool.matched` to each assigned group and `pool.assigned` to the matchmaker.

- [ ] **Delegated mode — non-matchmaker blocked**: regular member calling `pool_assign` returns `pool.role_required`.

- [ ] **Error: `pool.not_found`**: `pool_enter` with `create=False` on a missing pool raises `RuntimeError`.

- [ ] **Error: `pool.mode_mismatch`**: `pool_claim` in auto mode returns `pool.mode_mismatch`.

- [ ] **Error: `pool.target_not_found`**: `pool_claim` with a non-existent target ID returns `pool.target_not_found`.

- [ ] **Error: `pool.invalid_group`**: `pool_assign` with a wrong-sized group returns `pool.invalid_group`.

- [ ] **Pool lifecycle**: pool is destroyed when the last member leaves; subsequent `pool_enter` with `create=False` raises `RuntimeError`.

- [ ] Add a CI matrix entry (or Makefile target) that runs `sdks/python/integration/` with `STARFISH_SERVER_URL` pointing at the TypeScript server, separate from the Go server run.

## Acceptance Criteria

- All five pool modes have at least one happy-path test passing against the TypeScript server.
- All seven pool error codes are covered by at least one test each.
- Member visibility rules (auto invisible, claim-based visible to all, delegated visible only to matchmaker) are verified against the TypeScript server.
- Pool lifecycle (destroyed on last member leave) is verified.
- All tests pass with `pytest sdks/python/integration/` pointed at a running TypeScript server.
- Any behavioral differences between the TypeScript and Go servers are documented as comments in the test file.
