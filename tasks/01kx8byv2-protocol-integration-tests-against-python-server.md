---
title: "Protocol integration tests against Python server"
id: "01kx8byv2"
status: pending
priority: medium
effort: small
type: chore
tags: ["testing", "integration", "python"]
dependencies: ["01kwyst53"]
created_at: "2026-07-11"
phase: v0.2
---

# Protocol integration tests against Python server

## Objective

Run the protocol integration test suite (`tests/integration/`) against the Python server, mirroring the existing `make test-golang` and `make test-typescript` setup. This ensures the Python server conforms to the same protocol behavior as the other server implementations.

## Tasks

- [ ] Add `python` server type to `scripts/run-integration-tests.sh` (build, start, health-check, teardown)
- [ ] Add `test-python` target to `Makefile`
- [ ] Ensure all protocol integration tests pass against the Python server
- [ ] Update `test-integration` target to include the Python server

## Acceptance Criteria

- `make test-python` builds the Python server, starts it on a random port, runs the protocol integration tests against it, and tears down cleanly
- All protocol tests that pass against Go and TypeScript also pass against Python
- `test-integration` target runs protocol tests against Go, TypeScript, and Python servers
