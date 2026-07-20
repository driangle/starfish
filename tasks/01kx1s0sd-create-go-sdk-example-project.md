---
id: "01kx1s0sd"
title: "Create Go SDK example project"
status: completed
priority: medium
dependencies: ["01kwyst3n"]
tags: ["sdk", "go", "examples"]
created_at: 2026-07-08
phase: v0.2
completed_at: 2026-07-20
---

# Create Go SDK example project

## Objective

Create a standalone example project demonstrating the Go SDK's capabilities. The example should serve as a reference for developers using Starfish in Go services, CLI tools, or server-side applications.

## Tasks

- [x] Set up a minimal Go module in `examples/golang/` with go.mod
- [x] Create a basic connection example showing client setup, handshake, and session join/leave
- [x] Create a pub/sub example demonstrating topic subscribe, publish, and message handling
- [x] Create a presence example showing how to track connected peers
- [x] Create a shared data example demonstrating collaborative state with optimistic concurrency
- [x] Create a clock sync example showing synchronized timing across clients
- [x] Add a README with setup instructions, descriptions of each example, and links to SDK docs
- [x] Ensure all examples can run against the Go WebSocket server

## Acceptance Criteria

- Examples run successfully with `go run` commands
- Each example demonstrates a distinct SDK feature with inline comments explaining key concepts
- README provides clear setup and run instructions
- Examples connect to a local Starfish server and demonstrate real-time collaboration
