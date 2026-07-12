---
id: "01kx1whxd"
title: "Integration tests: Python SDK × TypeScript server"
status: completed
priority: medium
effort: small
dependencies: ["01kwyst2r", "01kwyst4k"]
tags: ["sdk", "python", "testing", "integration"]
created_at: 2026-07-09
phase: v0.1
completed_at: 2026-07-12
---

# Integration tests: Python SDK × TypeScript server

## Objective

Run the Python SDK integration test suite against the TypeScript server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [x] Add `typescript` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [x] Add `test-sdk-python-typescript` target to `Makefile`
- [x] Verify all integration tests pass against the TypeScript server

## Acceptance Criteria

- `make test-sdk-python-typescript` builds the TypeScript server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the TypeScript server
- The `test-sdk-python` target includes this server in its run
