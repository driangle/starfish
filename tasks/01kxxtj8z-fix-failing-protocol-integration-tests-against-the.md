---
id: "01kxxtj8z"
title: "Fix failing protocol integration tests against the Python server"
status: pending
priority: high
effort: medium
phase: v0.2
dependencies: ["01kwyst53"]
tags: ["testing", "integration", "python", "protocol"]
created_at: 2026-07-19
---

# Fix failing protocol integration tests against the Python server

## Objective

The protocol integration suite (`tests/integration/`, run via `make test-python`)
currently has failing cells against the Python server. These now surface in CI as a red
`integration / protocol × python` matrix cell (see task `01kxjcjm7`). Implement the
missing behavior so every protocol test passes against the Python server.

## Failing tests

Captured 2026-07-19 via `make test-python` (6 failures — identical set to the TypeScript
server, see `01kxxtj8w`):

- [ ] `connection: resume with valid token preserves clientId` — `welcome.resumed` is not
      `true` after resuming with a valid token.
- [ ] `connection: resume with invalid token gives fresh session` — resume with an invalid
      token does not fall back cleanly to a fresh session (`resumed` should be falsy).
- [ ] `pool resume: disconnected client retains membership within resume window` —
      membership is dropped immediately on disconnect instead of held for the resume window.
- [ ] `pool resume: reconnected client can still be matched` — a resumed client is not
      re-eligible for pool matchmaking.
- [ ] `pool-auto: three clients entering with groupSize 3 are matched together` —
      `groupSize > 2` is not honored.
- [ ] `pool-claim: pool.claim in auto mode returns pool.mode_mismatch` — returns
      `pool.not_member` instead of `pool.mode_mismatch`.

Note: unlike the Go and TypeScript servers, there is no dedicated "pool matchmaking support
to Python server" task on record, yet the Python server already passes the bulk of the pool
suite. Confirm pool support is complete while closing these edge cases.

## Tasks

- [ ] Fix connection resume so `welcome.resumed` reflects valid/invalid token outcomes
- [ ] Hold pool membership through the resume window and restore matchmaking on reconnect
- [ ] Implement `groupSize` > 2 matching in the pool matchmaker
- [ ] Return `pool.mode_mismatch` when claiming in a non-claim-mode pool
- [ ] Verify `make test-python` passes with zero failures

## Acceptance Criteria

- `make test-python` runs the full protocol suite against the Python server with no failures
- The `integration / protocol × python` CI cell is green
