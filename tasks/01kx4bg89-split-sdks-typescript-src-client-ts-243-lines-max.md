---
title: "Split sdks/typescript/src/client.ts (243 lines, max 200)"
id: "01kx4bg89"
status: completed
priority: medium
type: chore
tags: ["lint", "refactor"]
created_at: "2026-07-09"
completed_at: 2026-07-09
---

# Split sdks/typescript/src/client.ts (243 lines, max 200)

## Description

Reduce `client.ts` from 243 to under 200 lines by refactoring duplicated logic and moving frame construction into the RTC module.

## Tasks

- [x] Extract duplicated frame dispatch logic into `dispatchFrame()` method
- [x] Move RTC frame construction from `sendRTC()` into `RTC.send()` method
- [x] Add private `rtc` getter to eliminate repeated null-check boilerplate
- [x] Remove section comment lines (method names are self-documenting)
- [x] Verify type-checking and tests pass

## Acceptance Criteria

- `client.ts` is under 200 lines (now 197)
- All 147 unit tests pass
- ESLint max-lines rule passes on client.ts
