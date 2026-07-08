---
id: "01kx1s0rz"
title: "Create Python SDK example project"
status: pending
priority: medium
dependencies: ["01kwyst2r"]
tags: ["sdk", "python", "examples"]
created_at: 2026-07-08
---

# Create Python SDK example project

## Objective

Create a standalone example project demonstrating the Python SDK's capabilities. The example should serve as a reference for developers using Starfish in Python backends, data pipelines, or scripting contexts.

## Tasks

- [ ] Set up a minimal Python project in `examples/python/` with pyproject.toml or requirements.txt
- [ ] Create a basic connection example showing client setup, handshake, and session join/leave
- [ ] Create a pub/sub example demonstrating topic subscribe, publish, and message handling
- [ ] Create a presence example showing how to track connected peers
- [ ] Create a shared data example demonstrating collaborative state with optimistic concurrency
- [ ] Create a clock sync example showing synchronized timing across clients
- [ ] Add a README with setup instructions, descriptions of each example, and links to SDK docs
- [ ] Ensure all examples can run against the Go WebSocket server

## Acceptance Criteria

- Examples run successfully with `python example.py` or similar simple command
- Each example demonstrates a distinct SDK feature with inline comments explaining key concepts
- README provides clear setup and run instructions
- Examples connect to a local Starfish server and demonstrate real-time collaboration
