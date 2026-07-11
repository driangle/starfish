---
title: "Split sdks/typescript/src/connection.ts (210 lines, max 200)"
id: "01kx4bgb1"
status: completed
priority: low
type: chore
tags: ["lint", "refactor"]
created_at: "2026-07-09"
completed_at: 2026-07-09
phase: v0.1
---

# Split sdks/typescript/src/connection.ts (210 lines, max 200)

## Description

Reduce `connection.ts` from 210 to under 200 lines by condensing the handshake payload construction.

## Tasks

- [x] Condense `doHandshake` payload construction using ternary
- [x] Inline frame construction in `sendAndWait` call
- [x] Verify type-checking and all 147 tests pass
- [x] Verify ESLint max-lines passes

## Acceptance Criteria

- `connection.ts` is under 200 lines (now 199)
- All 147 unit tests pass
- ESLint lint passes
