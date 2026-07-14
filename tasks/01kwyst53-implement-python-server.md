---
title: "Implement Python Server"
id: "01kwyst53"
status: pending
priority: high
type: feature
tags: ["server", "python"]
created_at: "2026-07-07"
phase: v0.2
---

# Implement Python Server

## Objective

Implement the Python server for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. The server is the authoritative session coordinator and WebSocket router. Located in `servers/python/`.

## Tasks

- [ ] Set up Python project (pyproject.toml, package structure)
- [ ] Define server-side types/dataclasses matching the protocol spec
- [ ] Implement asyncio WebSocket server with connection management
- [ ] Implement `client.hello` → `server.welcome` handshake with `clientId` assignment
- [ ] Implement `resumeToken` generation, validation, and state hold/restore
- [ ] Implement resume timeout with `client.disconnected` cleanup
- [ ] Implement session management (create on join, destroy when empty)
- [ ] Implement `session.join` / `session.leave` with connection/disconnection events
- [ ] Implement topic subscription tracking
- [ ] Implement `topic.publish` → `topic.message` routing with type rewriting
- [ ] Implement `client.send` → `client.message` direct message routing
- [ ] Implement `session.broadcast` routing (exclude sender unless `includeSelf`)
- [ ] Implement presence storage and `presence.updated` broadcast with throttling
- [ ] Implement shared data store (scoped key-value with versioning)
- [ ] Implement all data operations (replace, merge, set.*, list.*, counter.add, delete)
- [ ] Implement optimistic concurrency (`expectedVersion` / `data.conflict`)
- [ ] Implement `data.changed` broadcast on mutations
- [ ] Implement application-level heartbeat with timeout detection
- [ ] Implement clock sync
- [ ] Implement acknowledgement routing
- [ ] Implement WebRTC signaling relay
- [ ] Implement `topic.peers` subscription map distribution
- [ ] Enforce security rules and payload size limits
- [ ] Implement all error codes from spec section 18
- [ ] Write unit tests for session and routing logic
- [ ] Write integration tests for full client-server flows

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
