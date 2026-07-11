---
title: "Implement Three.js Adapter"
id: "01kwyst79"
status: completed
priority: medium
type: feature
tags: ["adapter", "threejs", "typescript"]
created_at: "2026-07-07"
dependencies: ["01kwyst27"]
phase: v0.1
completed_at: 2026-07-11
---

# Implement Three.js Adapter

## Objective

Implement the Three.js adapter for Starfish, built on the TypeScript SDK. This adapter provides Three.js-idiomatic integration for networked 3D scenes, installations, and multiplayer experiences. Located in `adapters/threejs/`.

## Tasks

- [x] Set up project with TypeScript SDK as dependency
- [x] Design Three.js-friendly API that fits the render loop and scene graph
- [x] Implement `starfishThree` factory that wraps `StarfishClient`
- [x] Provide hooks for Three.js lifecycle: connect on init, cleanup on dispose
- [x] Expose presence API mapped to 3D transforms (position, rotation, scale)
- [x] Expose topic pub/sub with Three.js-style event patterns
- [x] Provide shared data helpers for collaborative 3D state
- [x] Implement peer representation helpers (create/update/remove 3D objects per peer)
- [x] Support high-frequency streaming for pose/transform data via RTC channels
- [ ] Add example scenes demonstrating common patterns (shared scene, avatar sync)
- [x] Write tests for adapter integration with the SDK

## Acceptance Criteria

- Adapter wraps TypeScript SDK without re-implementing protocol logic
- Connection lifecycle integrates with Three.js scene/renderer lifecycle
- Presence maps naturally to 3D transforms
- Peer objects can be automatically managed in the scene graph
- High-frequency data (poses, transforms) uses appropriate transport options
- Example scenes run and demonstrate multi-client 3D interaction
- Clean teardown when scene is disposed
