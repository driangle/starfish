---
title: "Add integration tests to CI with server matrix"
id: "01kxjcjm7"
status: pending
priority: critical
type: chore
tags: ["testing", "ci"]
created_at: "2026-07-15"
---

# Add integration tests to CI with server matrix

## Objective

Integration tests currently only run locally — the CI `check-integration` job only does type-checking. Add CI jobs that actually start servers and run the full protocol + SDK integration test suites across all server implementations, catching regressions automatically.

## Tasks

- [ ] Add a CI job matrix: `{protocol, ts-sdk, python-sdk} × {go-server, ts-server}`
- [ ] Use `scripts/run-integration-tests.sh` and `scripts/run-sdk-integration-tests.sh` to start servers and run tests
- [ ] Ensure each job starts the correct server, waits for readiness, runs tests, and tears down
- [ ] Wire path-based filtering so integration jobs only run when relevant code changes
- [ ] Verify all 6 matrix combinations pass in CI

## Acceptance Criteria

- CI runs protocol integration tests against both Go and TypeScript servers
- CI runs TypeScript SDK integration tests against both servers
- CI runs Python SDK integration tests against both servers
- Failures in any matrix cell block the PR
- Jobs are skipped when only unrelated files change
