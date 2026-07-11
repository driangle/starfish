---
title: "Add formatting checks for TypeScript and Go projects"
id: "01kx4bkkb"
status: completed
priority: high
type: chore
tags: ["lint", "formatting"]
created_at: "2026-07-09"
phase: v0.1
completed_at: 2026-07-11
---

# Add formatting checks for TypeScript and Go projects

## Objective

Add automated formatting checks to `check-lite` so that unformatted code is caught before tests run. TypeScript projects should use Prettier; Go should use `gofmt`. Also wire `check` to depend on `check-lite` so it includes linting and formatting.

## Projects

- `sdks/typescript` — Prettier
- `adapters/p5js` — Prettier
- `tests/integration` — Prettier
- `examples/typescript` — Prettier
- `servers/golang` — `gofmt`

## Tasks

- [x] Install Prettier in each TypeScript project and add a shared `.prettierrc`
- [x] Add `"format:check": "prettier --check ."` script to each TypeScript project's `package.json`
- [x] Add `gofmt -l` check for the Go server (fail if any files are unformatted)
- [x] Add `make format` target that runs formatting across all projects (auto-fix mode)
- [x] Add `make format-check` target that runs formatting checks (CI-safe, no writes)
- [x] Wire `format-check` into `check-lite`
- [x] Wire `check` to depend on `check-lite` so it includes linting + formatting + compilation
- [x] Fix any existing formatting violations
- [x] Verify `make check-lite` runs: lint, format-check, compilation
- [x] Verify `make check` runs: check-lite + unit tests

## Acceptance Criteria

- Every TypeScript project has Prettier configured with a `format:check` script
- Go formatting is verified via `gofmt -l`
- `make format` auto-formats all projects
- `make format-check` fails if any file is unformatted (no file writes)
- `make check-lite` = linting + formatting + compilation (no tests)
- `make check` = `check-lite` + unit tests
