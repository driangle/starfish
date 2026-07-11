---
title: "Protocol integration tests against TypeScript server"
id: "01kx8aw7w"
status: completed
priority: high
effort: small
type: chore
tags: ["testing", "integration", "typescript"]
created_at: "2026-07-11"
phase: v0.1
completed_at: 2026-07-11
---

# Protocol integration tests against TypeScript server

## Objective

Run the protocol integration test suite (`tests/integration/`) against the TypeScript server, mirroring the existing `make test-golang` setup. This ensures the TypeScript server conforms to the same protocol behavior as the Go server.

## Tasks

- [x] Add `typescript` server type to `scripts/run-integration-tests.sh` (build, start, health-check, teardown)
- [x] Add `test-typescript` target to `Makefile`
- [x] Ensure all protocol integration tests pass against the TypeScript server
- [x] Update `test-integration` target to include the TypeScript server

## Acceptance Criteria

- `make test-typescript` builds the TypeScript server, starts it on a random port, runs the protocol integration tests against it, and tears down cleanly
- All protocol tests that pass against Go also pass against TypeScript
- `test-integration` target runs protocol tests against both Go and TypeScript servers
