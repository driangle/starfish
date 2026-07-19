---
title: "Add integration tests to CI with server matrix"
id: "01kxjcjm7"
status: completed
priority: critical
type: chore
tags: ["testing", "ci"]
created_at: "2026-07-15"
completed_at: 2026-07-19
---

# Add integration tests to CI with server matrix

## Objective

Integration tests currently only run locally — the CI `check-integration` job only does type-checking. Add CI jobs that actually start servers and run the full protocol + SDK integration test suites across all server implementations, catching regressions automatically.

## Tasks

- [x] Add a CI job matrix (expanded to the full current matrix — see Notes)
- [x] Use `scripts/run-integration-tests.sh` and `scripts/run-sdk-integration-tests.sh` to start servers and run tests
- [x] Ensure each job starts the correct server, waits for readiness, runs tests, and tears down
- [x] Wire path-based filtering so integration jobs only run when relevant code changes
- [x] Verify matrix combinations pass in CI (SDK cells green; protocol cells red pending fix tasks — see Notes)

## Acceptance Criteria

- CI runs protocol integration tests against both Go and TypeScript servers
- CI runs TypeScript SDK integration tests against both servers
- CI runs Python SDK integration tests against both servers
- Failures in any matrix cell block the PR
- Jobs are skipped when only unrelated files change

## Notes

**Matrix scope (expanded).** The task originally specified `{protocol, ts-sdk, python-sdk} ×
{go-server, ts-server}` (6 cells). Since it was written, the repo gained a Python server and
a Go SDK, both with full `make` targets. Per decision, the CI matrix was expanded to the
**full current 12-cell matrix** in `.github/workflows/ci.yml` (job `integration`):

| suite      | × go | × ts | × python |
|------------|------|------|----------|
| protocol   | `test-golang` | `test-typescript` | `test-python` |
| ts-sdk     | `test-sdk-typescript-golang` | `test-sdk-typescript-typescript` | `test-sdk-typescript-python` |
| python-sdk | `test-sdk-python-golang` | `test-sdk-python-typescript` | `test-sdk-python-python` |
| go-sdk     | `test-sdk-golang-golang` | `test-sdk-golang-typescript` | `test-sdk-golang-python` |

`fail-fast: false` so one red cell doesn't cancel the rest; each cell installs Go + Node +
Python and runs one `make` target (the scripts self-manage server build/start/wait/teardown).
Path filter `integration-run` triggers the matrix on changes to `servers/**`, `sdks/**`,
`tests/integration/**`, the run scripts, the `Makefile`, or `ci.yml`.

**Known-red protocol cells.** Per decision, the protocol cells were wired as-is and left red
for now. `protocol × {go, ts, python}` fail 4–6 pre-existing conformance tests (session
resume + a few pool edge cases). All 9 SDK cells pass. Fix tasks were created (one per
failing protocol cell):

- `01kxxtj24` — Fix failing protocol integration tests against the Go server
- `01kxxtj8w` — Fix failing protocol integration tests against the TypeScript server
- `01kxxtj8z` — Fix failing protocol integration tests against the Python server
