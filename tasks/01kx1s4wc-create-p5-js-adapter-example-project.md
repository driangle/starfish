---
id: "01kx1s4wc"
title: "Create p5.js adapter example project"
status: completed
priority: medium
dependencies: ["01kwyst6q"]
tags: ["adapter", "p5js", "examples"]
created_at: 2026-07-08
completed_at: 2026-07-09
---

# Create p5.js adapter example project

## Objective

Create an example p5.js project demonstrating how to use the Starfish p5.js adapter for collaborative creative coding sketches. The example should showcase real-time multi-user interaction patterns common in creative coding.

## Tasks

- [x] Set up example project in `examples/p5js/` with HTML, JS, and package.json
- [x] Create a shared canvas example where multiple users draw collaboratively in real-time
- [x] Create a multiplayer cursor example showing all connected users' cursor positions
- [x] Create a collaborative generative art example using shared data to sync parameters
- [x] Add presence visualization showing connected peers on the canvas
- [x] Add a README with setup instructions, example descriptions, and screenshots/GIFs
- [x] Ensure examples work in both p5.js global mode and instance mode
- [x] Ensure examples run against a local Starfish server

## Acceptance Criteria

- Examples open in a browser and connect to a local Starfish server
- Opening multiple browser tabs demonstrates real-time collaboration on the canvas
- Each example includes inline comments explaining the adapter API usage
- README provides clear setup and run instructions
- Examples demonstrate presence, pub/sub, and shared data through p5.js-idiomatic patterns
