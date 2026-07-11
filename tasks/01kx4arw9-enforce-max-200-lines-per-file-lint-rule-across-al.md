---
title: "Enforce max 200 lines per file lint rule across all projects"
id: "01kx4arw9"
status: completed
priority: high
type: chore
tags: ["lint", "code-quality"]
created_at: "2026-07-09"
completed_at: 2026-07-09
phase: v0.1
---

# Enforce max 200 lines per file lint rule across all projects

## Objective

Ensure every project in the monorepo has a lint rule enforcing a maximum of 200 lines per source file. Test files (`*.test.ts`, `*_test.go`, etc.) have a separate limit of 500 lines. This keeps source files focused and scannable, aligned with the codebase's file-organization principles. After adding the lint rules, audit for existing violations and create follow-up tasks to split any files that exceed the limit.

Note: `examples/p5js/starfish-p5.global.js` is a build artifact (esbuild bundle copied from `adapters/p5js`). It should be `.gitignore`d rather than committed — handle this as part of the task.

## Projects

- `sdks/typescript` — TypeScript (ESLint or Biome)
- `adapters/p5js` — TypeScript (ESLint or Biome)
- `servers/golang` — Go (golangci-lint / lll or custom)
- `tests/integration` — TypeScript (ESLint or Biome)
- `examples/typescript` — TypeScript (ESLint or Biome)

## Tasks

- [x] Choose a linter for TypeScript projects (ESLint with `max-lines` rule or Biome equivalent) and configure it
- [x] Add lint config to `sdks/typescript` with `max-lines: 200` for source, `max-lines: 500` for test files
- [x] Add lint config to `adapters/p5js` with `max-lines: 200`
- [x] Add lint config to `tests/integration` with `max-lines: 200`
- [x] Add lint config to `examples/typescript` with `max-lines: 200`
- [x] Add file-length check for `servers/golang` (200 source, 500 test via `scripts/check-file-length.sh`)
- [x] Remove `examples/p5js/starfish-p5.global.js` from git and add it to `.gitignore` (it's a build artifact)
- [x] Add a top-level `make lint` target that runs linting across all projects
- [x] Run linting across all projects and collect violations
- [x] Create follow-up tasks for each file exceeding 200 lines (see known violations below)

## Known Violations (excluding node_modules/dist/build artifacts)

### Source files (> 200 lines)

| File | Lines |
|------|-------|
| `sdks/typescript/src/rtc.ts` | 425 |
| `sdks/typescript/src/client.ts` | 243 |
| `servers/golang/starfish/resume.go` | 228 |
| `servers/golang/starfish/data_store.go` | 228 |
| `sdks/typescript/src/connection.ts` | 210 |

### Test files (> 500 lines)

| File | Lines |
|------|-------|
| `servers/golang/starfish/integration_test.go` | 717 |
| `sdks/typescript/src/rtc.test.ts` | 527 |

### Build artifacts (should be .gitignored, not linted)

| File | Lines |
|------|-------|
| `examples/p5js/starfish-p5.global.js` | 1541 |

## Acceptance Criteria

- Every project has a lint rule: 200 lines max for source files, 500 lines max for test files
- `examples/p5js/starfish-p5.global.js` is removed from git and `.gitignore`d
- `make lint` runs linting across all projects from the repo root
- A follow-up task exists for each file currently exceeding its limit (5 source files, 2 test files)
- Lint passes on all files that are already under their respective limits
