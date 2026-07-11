---
id: "01kx1whss"
title: "Integration tests: Python SDK × Go server"
status: pending
priority: medium
effort: medium
dependencies: ["01kwyst2r", "01kwyst5m"]
tags: ["sdk", "python", "testing", "integration"]
created_at: 2026-07-09
phase: v0.1
---

# Integration tests: Python SDK × Go server

## Objective

Run the Python SDK integration test suite against the Go server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [ ] Add `golang` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [ ] Add `python` SDK test runner to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [ ] Set up integration test infrastructure in `sdks/python/integration/` (using pytest)
- [ ] Write integration tests covering connection, session, topics, messaging, presence, and data
- [ ] Add `test-sdk-python-golang` target to `Makefile`
- [ ] Verify all integration tests pass against the Go server

## Acceptance Criteria

- `make test-sdk-python-golang` builds the Go server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the Go server
- The `test-sdk-python` target includes this server in its run
