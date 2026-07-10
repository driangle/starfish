---
id: "01kx5xce9"
title: "TS Server: Project scaffold & core types"
status: completed
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: []
created_at: 2026-07-10
phase: v0.1
completed_at: 2026-07-10
---

# TS Server: Project scaffold & core types

## Objective

Set up the TypeScript server project in `servers/typescript/` with build tooling matching the SDK conventions, and define all core types, constants, and utilities needed by subsequent tasks.

## Context

Mirror the toolchain used by `sdks/typescript/`: ESM-only, `tsc` build, `vitest` for tests, ESLint. Port types from the Go server's `frame.go`, `errors.go`, `limits.go`, and `id.go`.

## Tasks

- [x] Initialize `package.json` (ESM, `@starfish/server`, devDeps: typescript, vitest, eslint)
- [x] Create `tsconfig.json` (ES2022, strict, declaration, sourceMap — match SDK)
- [x] Add ESLint config matching SDK conventions
- [x] Add `Makefile` with `build`, `test`, `lint`, `check`, `check-lite` targets
- [x] Wire into top-level `Makefile` targets
- [x] Define `StarfishFrame` type (canonical envelope: v, id, type, ts, session, from, to, topic, ack, replyTo, transport, options, payload, error)
- [x] Define `FrameOptions` and `DeliveryOptions` types
- [x] Implement error codes module (all 19 codes from spec section 18, message table, `createErrorFrame` factory)
- [x] Implement limits constants (WS 64KB, presence 8KB, data 256KB, topic name 128 chars, client meta 16KB)
- [x] Implement ID generator (`client_XXXX`, `rt_XXXX`, `srv_N` patterns)
- [x] Write unit tests for ID generator and error frame factory

## Acceptance Criteria

- `npm run build` compiles cleanly with zero errors
- `npm test` passes all unit tests
- `npm run lint` passes
- All 19 error codes from spec section 18 are defined
- All payload size limits from spec section 24 are defined
- ID generator produces correctly formatted IDs
