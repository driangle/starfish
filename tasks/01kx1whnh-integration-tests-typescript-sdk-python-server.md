---
id: "01kx1whnh"
title: "Integration tests: TypeScript SDK × Python server"
status: pending
priority: medium
effort: small
dependencies: ["01kwyst27", "01kwyst53"]
tags: ["sdk", "typescript", "testing", "integration"]
created_at: 2026-07-09
---

# Integration tests: TypeScript SDK × Python server

## Objective

Run the TypeScript SDK integration test suite against the Python server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [ ] Add `python` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [ ] Add `test-sdk-typescript-python` target to `Makefile`
- [ ] Verify all integration tests pass against the Python server

## Acceptance Criteria

- `make test-sdk-typescript-python` builds the Python server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the Python server
- The `test-sdk-typescript` target includes this server in its run
