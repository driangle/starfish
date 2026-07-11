---
id: "01kx1wj7d"
title: "Integration tests: Go SDK × Go server"
status: pending
priority: medium
effort: medium
dependencies: ["01kwyst3n", "01kwyst5m"]
tags: ["sdk", "go", "testing", "integration"]
created_at: 2026-07-09
phase: v0.1
---

# Integration tests: Go SDK × Go server

## Objective

Run the Go SDK integration test suite against the Go server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [ ] Add `golang` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [ ] Add `golang` SDK test runner to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [ ] Set up integration test infrastructure in `sdks/golang/integration/` (using Go test)
- [ ] Write integration tests covering connection, session, topics, messaging, presence, and data
- [ ] Add `test-sdk-golang-golang` target to `Makefile`
- [ ] Verify all integration tests pass against the Go server

## Acceptance Criteria

- `make test-sdk-golang-golang` builds the Go server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the Go server
- The `test-sdk-golang` target includes this server in its run
