---
title: "Split sdks/typescript/src/rtc.ts (425 lines, max 200)"
id: "01kx4bg7b"
status: completed
priority: high
type: chore
tags: ["lint", "refactor"]
created_at: "2026-07-09"
completed_at: 2026-07-09
phase: v0.1
---

# Split sdks/typescript/src/rtc.ts (425 lines, max 200)

## Description

Split the RTC module from 425 lines into 3 focused files under the 200-line limit.

## Tasks

- [x] Extract signaling handlers into `rtc-signaling.ts` (124 lines)
- [x] Extract peer connection factory + data channel setup into `rtc-peer-connection.ts` (131 lines)
- [x] Add `sendSignal` helper to reduce frame construction boilerplate
- [x] Compress `getConnectedPeerIds` and `updateObservable` with functional style
- [x] Verify type-checking and all 147 tests pass
- [x] Verify ESLint max-lines passes on all 3 files

## Acceptance Criteria

- `rtc.ts` is under 200 lines (now 197)
- `rtc-signaling.ts` is under 200 lines (124)
- `rtc-peer-connection.ts` is under 200 lines (131)
- All 147 unit tests pass
- ESLint lint passes
