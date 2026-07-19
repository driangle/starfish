---
title: "Implement Python Server"
id: "01kwyst53"
status: completed
priority: high
type: feature
tags: ["server", "python"]
created_at: "2026-07-07"
phase: v0.2
completed_at: 2026-07-19
---

# Implement Python Server

## Objective

Implement the Python server for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. The server is the authoritative session coordinator and WebSocket router. Located in `servers/python/`.

## Tasks

- [x] Set up Python project (pyproject.toml, package structure)
- [x] Define server-side types/dataclasses matching the protocol spec
- [x] Implement asyncio WebSocket server with connection management
- [x] Implement `client.hello` → `server.welcome` handshake with `clientId` assignment
- [x] Implement `resumeToken` generation, validation, and state hold/restore
- [x] Implement resume timeout with `client.disconnected` cleanup
- [x] Implement session management (create on join, destroy when empty)
- [x] Implement `session.join` / `session.leave` with connection/disconnection events
- [x] Implement topic subscription tracking
- [x] Implement `topic.publish` → `topic.message` routing with type rewriting
- [x] Implement `client.send` → `client.message` direct message routing
- [x] Implement `session.broadcast` routing (exclude sender unless `includeSelf`)
- [x] Implement presence storage and `presence.updated` broadcast with throttling
- [x] Implement shared data store (scoped key-value with versioning)
- [x] Implement all data operations (replace, merge, set.*, list.*, counter.add, delete)
- [x] Implement optimistic concurrency (`expectedVersion` / `data.conflict`)
- [x] Implement `data.changed` broadcast on mutations
- [x] Implement application-level heartbeat with timeout detection
- [x] Implement clock sync
- [x] Implement acknowledgement routing
- [x] Implement WebRTC signaling relay
- [x] Implement `topic.peers` subscription map distribution
- [x] Enforce security rules and payload size limits
- [x] Implement all error codes from spec section 18
- [x] Write unit tests for session and routing logic
- [x] Write integration tests for full client-server flows

## Acceptance Criteria

- Server accepts WebSocket connections and completes handshake
- Sessions are created/destroyed dynamically
- Topic pub/sub, direct messaging, and broadcast route correctly
- Presence is stored and broadcast with throttling
- Shared data store supports all operations with versioning and optimistic concurrency
- Reconnection via `resumeToken` restores state
- Heartbeat timeout triggers client disconnection
- WebRTC signaling relays correctly
- All security rules and error codes are enforced
- Idiomatic Python async implementation
