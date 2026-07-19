---
id: "01kx1wjb4"
title: "Integration tests: Go SDK × TypeScript server"
status: completed
priority: medium
effort: small
dependencies: ["01kwyst3n", "01kwyst4k"]
tags: ["sdk", "go", "testing", "integration"]
created_at: 2026-07-09
phase: v0.2
completed_at: 2026-07-19
---

# Integration tests: Go SDK × TypeScript server

## Objective

Run the Go SDK integration test suite against the TypeScript server, verifying that the SDK client works correctly end-to-end with this server implementation.

## Tasks

- [x] Add `typescript` server starter to `scripts/run-sdk-integration-tests.sh` (if not already present)
- [x] Add `test-sdk-golang-typescript` target to `Makefile`
- [x] Verify all integration tests pass against the TypeScript server

## Acceptance Criteria

- `make test-sdk-golang-typescript` builds the TypeScript server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the TypeScript server
- The `test-sdk-golang` target includes this server in its run
