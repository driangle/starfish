---
id: "01kx1wgtc"
title: "Integration tests: TypeScript SDK × TypeScript server"
status: pending
priority: medium
effort: small
dependencies: ["01kwyst27", "01kwyst4k"]
tags: ["sdk", "typescript", "testing", "integration"]
created_at: 2026-07-09
---

# Integration tests: TypeScript SDK × TypeScript server

## Objective

Run the TypeScript SDK integration test suite against the TypeScript server, verifying that `StarfishClient` works correctly end-to-end with this server implementation.

## Tasks

- [ ] Add `typescript` server starter to `scripts/run-sdk-integration-tests.sh`
- [ ] Add `test-sdk-typescript-typescript` target to `Makefile`
- [ ] Verify all existing integration tests in `sdks/typescript/integration/` pass against the TypeScript server
- [ ] Add any server-specific test cases if behavior differs

## Acceptance Criteria

- `make test-sdk-typescript-typescript` builds the TypeScript server, starts it, runs the SDK integration tests, and tears down
- All integration tests (connection, session, topics, messaging, presence, data) pass against the TypeScript server
- The `test-sdk-typescript` target runs against both Go and TypeScript servers
