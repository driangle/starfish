---
title: "Implement p5.js Adapter"
id: "01kwyst6q"
status: completed
priority: medium
type: feature
tags: ["adapter", "p5js", "typescript"]
created_at: "2026-07-07"
dependencies: ["01kwyst27"]
completed_at: 2026-07-09
---

# Implement p5.js Adapter

## Objective

Implement the p5.js adapter for Starfish, built on the TypeScript SDK. This adapter provides p5.js-idiomatic integration so creative coders can use Starfish in p5.js sketches with minimal boilerplate. Located in `adapters/p5js/`.

## Tasks

- [x] Set up project with TypeScript SDK as dependency
- [x] Design p5.js-friendly API that fits the sketch lifecycle (setup/draw)
- [x] Implement `starfishP5` factory or plugin that wraps `StarfishClient`
- [x] Provide hooks for p5 lifecycle: auto-connect in `setup()`, cleanup on sketch stop
- [x] Expose simplified presence API (e.g., auto-send cursor position in `draw()`)
- [x] Expose simplified topic pub/sub with p5-style callbacks
- [x] Provide shared data helpers for collaborative sketches
- [x] Implement peer rendering helpers (iterate connected peers with their presence data)
- [x] Add example sketches demonstrating common patterns (shared canvas, multiplayer cursor)
- [x] Write tests for adapter integration with the SDK

## Acceptance Criteria

- Adapter wraps TypeScript SDK without re-implementing protocol logic
- Works in p5.js instance mode and global mode
- Connection lifecycle ties into p5 sketch lifecycle
- Presence can be set and read with minimal code
- Topic pub/sub works through the adapter
- Example sketches run and demonstrate multi-client interaction
- Clean teardown when sketch is stopped/removed
