---
id: "01kx1s0r3"
title: "Create TypeScript SDK example project"
status: completed
priority: medium
dependencies: ["01kwyst27"]
tags: ["sdk", "typescript", "examples"]
created_at: 2026-07-08
completed_at: 2026-07-09
---

# Create TypeScript SDK example project

## Objective

Create a standalone example project demonstrating the TypeScript SDK's capabilities. The example should serve as both a learning resource and a quick-start template for developers building browser-based collaborative apps with Starfish.

## Tasks

- [x] Set up a minimal TypeScript project in `examples/typescript/` with package.json and tsconfig
- [x] Create a basic connection example showing client setup, handshake, and session join/leave
- [x] Create a pub/sub example demonstrating topic subscribe, publish, and message handling
- [x] Create a presence example showing how to track and display connected peers
- [x] Create a shared data example demonstrating collaborative state with optimistic concurrency
- [x] Create a clock sync example showing synchronized timing across clients
- [x] Add a README with setup instructions, descriptions of each example, and links to SDK docs
- [x] Ensure all examples can run against the Go WebSocket server

## Acceptance Criteria

- Examples run successfully with `npm start` or similar simple command
- Each example demonstrates a distinct SDK feature with inline comments explaining key concepts
- README provides clear setup and run instructions
- Examples connect to a local Starfish server and demonstrate real-time collaboration
