---
id: "01kxxtj24"
title: "Fix failing protocol integration tests against the Go server"
status: completed
priority: high
effort: medium
phase: v0.2
dependencies: ["01kwyst5m"]
tags: ["testing", "integration", "golang", "protocol"]
created_at: 2026-07-19
completed_at: 2026-07-19
---

# Fix failing protocol integration tests against the Go server

## Objective

The protocol integration suite (`tests/integration/`, run via `make test-golang`)
currently has failing cells against the Go server. These now surface in CI as a red
`integration / protocol × go` matrix cell (see task `01kxjcjm7`). Implement the missing
behavior so every protocol test passes against the Go server.

## Failing tests

Captured 2026-07-19 via `make test-golang` (3 consistent failures):

- [x] `pool-auto: three clients entering with groupSize 3 are matched together` — group
      matching only pairs clients; `groupSize > 2` is not honored.
- [x] `pool-claim: pool.claim in auto mode returns pool.mode_mismatch` — Go returns
      `pool.not_found` instead of `pool.mode_mismatch` when a client claims in a pool
      whose mode does not permit claiming.
- [x] `pool resume: reconnected client can still be matched` — a client that reconnects
      via resume is not re-eligible for pool matchmaking.

Also observed intermittently (investigate for flakiness, not necessarily a code fix):

- [x] `pool-delegated: assigning non-existent member returns pool.target_not_found` —
      passed in most runs, failed once; confirm whether this is a race/flake.

## Tasks

- [x] Implement `groupSize` > 2 matching in the Go server pool matchmaker
- [x] Return `pool.mode_mismatch` when claiming in a non-claim-mode pool
- [x] Restore pool matchmaking eligibility after a client resumes
- [x] Investigate the intermittent `pool.target_not_found` failure
- [x] Verify `make test-golang` passes with zero failures

## Acceptance Criteria

- `make test-golang` runs the full protocol suite against the Go server with no failures
- The `integration / protocol × go` CI cell is green
