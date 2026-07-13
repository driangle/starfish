---
id: "01kx1s4wx"
title: "Create Three.js adapter example project"
status: completed
priority: medium
dependencies: ["01kwyst79"]
tags: ["adapter", "threejs", "examples"]
created_at: 2026-07-08
phase: v0.1
completed_at: 2026-07-12
---

# Create Three.js adapter example project

## Objective

Create an example Three.js project demonstrating how to use the Starfish Three.js adapter for networked 3D scenes. The example should showcase real-time multi-user 3D interaction patterns.

## Tasks

- [x] Set up example project in `examples/threejs/` with HTML, JS/TS, and package.json
- [x] Create a shared 3D scene example where users can add and manipulate objects collaboratively
- [x] Create an avatar sync example showing each user's position and orientation in 3D space
- [x] Create a collaborative scene editor example using shared data for object properties
- [x] Add peer representation with auto-managed 3D avatars in the scene graph
- [x] Add a README with setup instructions, example descriptions, and screenshots/GIFs
- [x] Ensure examples run against a local Starfish server

## Acceptance Criteria

- Examples open in a browser and connect to a local Starfish server
- Opening multiple browser tabs shows multiple avatars/users in the 3D scene
- Each example includes inline comments explaining the adapter API usage
- README provides clear setup and run instructions
- Examples demonstrate presence (3D transforms), pub/sub, and shared data through Three.js-idiomatic patterns
