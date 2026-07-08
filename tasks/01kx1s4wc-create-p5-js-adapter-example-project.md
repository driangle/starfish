---
id: "01kx1s4wc"
title: "Create p5.js adapter example project"
status: pending
priority: medium
dependencies: ["01kwyst6q"]
tags: ["adapter", "p5js", "examples"]
created_at: 2026-07-08
---

# Create p5.js adapter example project

## Objective

Create an example p5.js project demonstrating how to use the Starfish p5.js adapter for collaborative creative coding sketches. The example should showcase real-time multi-user interaction patterns common in creative coding.

## Tasks

- [ ] Set up example project in `examples/p5js/` with HTML, JS, and package.json
- [ ] Create a shared canvas example where multiple users draw collaboratively in real-time
- [ ] Create a multiplayer cursor example showing all connected users' cursor positions
- [ ] Create a collaborative generative art example using shared data to sync parameters
- [ ] Add presence visualization showing connected peers on the canvas
- [ ] Add a README with setup instructions, example descriptions, and screenshots/GIFs
- [ ] Ensure examples work in both p5.js global mode and instance mode
- [ ] Ensure examples run against a local Starfish server

## Acceptance Criteria

- Examples open in a browser and connect to a local Starfish server
- Opening multiple browser tabs demonstrates real-time collaboration on the canvas
- Each example includes inline comments explaining the adapter API usage
- README provides clear setup and run instructions
- Examples demonstrate presence, pub/sub, and shared data through p5.js-idiomatic patterns
