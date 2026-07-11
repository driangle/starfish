---
title: "Add type-checking for SDK integration tests"
id: "01kx8q6ae"
status: completed
priority: medium
effort: small
type: chore
tags: ["testing", "typescript", "sdk"]
created_at: "2026-07-11"
phase: v0.1
completed_at: 2026-07-11
---

# Add type-checking for SDK integration tests

## Objective

Ensure the TypeScript SDK integration tests (`sdks/typescript/integration/`) are properly type-checked against the SDK source. Currently, Vitest uses esbuild which strips types without checking them, so type errors (e.g. passing wrong option shapes) go undetected until runtime.

## Tasks

- [x] Add a `tsconfig.json` for the integration tests that references the SDK source types
- [x] Add a `check-sdk-integration` target to the Makefile that runs `tsc --noEmit` on the integration tests
- [x] Include the new target in `check-lite` or `check-integration`
- [x] Fix any type errors uncovered by the new check

## Acceptance Criteria

- `tsc --noEmit` runs cleanly on `sdks/typescript/integration/*.test.ts` against the SDK's exported types
- A Makefile target exists to run this check
- Type errors like passing `{ includeSelf: true }` instead of `{ delivery: { includeSelf: true } }` would be caught at compile time
