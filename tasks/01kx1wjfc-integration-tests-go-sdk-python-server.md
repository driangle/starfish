---
id: "01kx1wjfc"
title: "Integration tests: Go SDK × Python server"
status: completed
priority: medium
effort: small
dependencies: ["01kwyst3n", "01kwyst53"]
tags: ["sdk", "go", "testing", "integration"]
created_at: 2026-07-09
phase: v0.1
completed_at: 2026-07-19
---

# Integration tests: Go SDK × Python server

## Objective

Run the Go SDK integration test suite against the Python server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [x] Add `python` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [x] Add `test-sdk-golang-python` target to `Makefile`
- [x] Verify all integration tests pass against the Python server

## Acceptance Criteria

- `make test-sdk-golang-python` builds the Python server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the Python server
- The `test-sdk-golang` target includes this server in its run
