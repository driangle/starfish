---
title: "Decouple presence from cursor tracking in p5.js adapter"
id: "01kx8zeka"
status: pending
priority: medium
type: feature
tags: ["adapter", "p5js", "refactor"]
created_at: "2026-07-11"
phase: v0.1
---

# Decouple presence from cursor tracking in p5.js adapter

## Objective

Make presence in the p5.js adapter generic, matching the approach used in the Three.js adapter. Currently, `PresenceTracker` automatically merges cursor coordinates (`x`, `y`) into presence data and the `PeerPresence` type hardcodes `x`/`y` fields. Presence should be user-defined — the adapter should not assume what data the user wants to broadcast.

## Tasks

- [ ] Remove `autoTrackCursor` logic from `PresenceTracker` — presence should only broadcast what the user explicitly sets
- [ ] Make `setPresence(data)` accept arbitrary `Record<string, unknown>` without merging cursor position
- [ ] Remove `x`/`y` fields from `PeerPresence` type — replace with generic `presence: Record<string, unknown>`
- [ ] Remove `getMousePosition` and cursor-related code from `p5-lifecycle.ts`
- [ ] Simplify or remove `PresenceTracker` if it only handles throttling (inline throttle into `StarfishP5`)
- [ ] Remove `update()` method if it no longer serves a purpose (cursor polling was its only job)
- [ ] Update tests to reflect the new generic presence API
- [ ] Ensure the `P5Instance` type no longer requires `mouseX`/`mouseY`

## Acceptance Criteria

- `setPresence(data)` broadcasts exactly what the user passes, with no automatic cursor merging
- `PeerPresence` (or equivalent) exposes raw presence data without hardcoded coordinate fields
- Users who want cursor tracking can implement it themselves by calling `setPresence({ x: mouseX, y: mouseY })` in their draw loop
- No breaking changes to `start()`/`stop()`/`on()`/`emit()` or other non-presence APIs
- All tests pass with the updated presence model
