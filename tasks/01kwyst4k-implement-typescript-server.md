---
title: "Implement TypeScript Server"
id: "01kwyst4k"
status: completed
priority: high
type: feature
tags: ["server", "typescript"]
created_at: "2026-07-07"
phase: v0.1
completed_at: 2026-07-11
---

# Implement TypeScript Server

## Objective

Implement the TypeScript server for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. The server is the authoritative session coordinator and WebSocket router. Located in `servers/typescript/`.

## Tasks

- [x] Set up TypeScript project with build tooling
- [x] Define server-side types matching the protocol spec
- [x] Implement WebSocket server with connection management
- [x] Implement `client.hello` → `server.welcome` handshake with `clientId` assignment
- [x] Implement `resumeToken` generation, validation, and state hold/restore
- [x] Implement resume timeout with `client.disconnected` cleanup
- [x] Implement session management (create on join, destroy when empty)
- [x] Implement `session.join` / `session.leave` with `client.connected` / `client.disconnected` events
- [x] Implement topic subscription tracking
- [x] Implement `topic.publish` → `topic.message` routing with type rewriting
- [x] Implement `client.send` → `client.message` direct message routing
- [x] Implement `session.broadcast` routing (exclude sender unless `includeSelf`)
- [x] Implement presence storage and `presence.updated` broadcast with 50ms throttling
- [x] Implement shared data store (scoped key-value with versioning)
- [x] Implement all data operations (replace, merge, set.*, list.*, counter.add, delete)
- [x] Implement optimistic concurrency (`expectedVersion` / `data.conflict`)
- [x] Implement `data.changed` broadcast on mutations
- [x] Implement application-level heartbeat (`ping`/`pong`) with 2x timeout detection
- [x] Implement clock sync (`clock.sync` → `clock.synced`)
- [x] Implement acknowledgement routing (`ack`/`nack`)
- [x] Implement WebRTC signaling relay (offer/answer/ICE forwarding)
- [x] Implement `topic.peers` subscription map distribution
- [x] Enforce security rules (session membership, `from` overwrite, scope enforcement)
- [x] Enforce payload size limits per spec section 24
- [x] Implement error responses with all error codes from spec section 18
- [x] Write unit tests for session and routing logic
- [x] Write integration tests for full client-server flows
- [x] Write integration tests for data operations and conflict resolution

## Sub-tasks

1. `01kx5xce9` — TS Server: Project scaffold & core types
2. `01kx5xcea` — TS Server: WebSocket server & connection handshake
3. `01kx5xcm0` — TS Server: Session management
4. `01kx5xcm4` — TS Server: Topic pub/sub & messaging
5. `01kx5xcm7` — TS Server: Presence
6. `01kx5xcmb` — TS Server: Shared data store
7. `01kx5xcme` — TS Server: Resume, heartbeat & system messages
8. `01kx5xcmj` — TS Server: WebRTC relay, security & limits

## Acceptance Criteria

- Server accepts WebSocket connections and completes handshake
- Sessions are created/destroyed dynamically based on membership
- Topic pub/sub routes messages correctly with type rewriting
- Direct messaging routes to correct client
- Broadcast delivers to all session members (respecting `includeSelf`)
- Presence is stored per-client and broadcast with throttling
- Shared data store supports all operations with versioning
- Optimistic concurrency rejects version mismatches with `data.conflict`
- Reconnection via `resumeToken` restores session/topic/presence state
- Heartbeat timeout triggers client disconnection
- WebRTC signaling relays correctly between same-session clients
- All security rules from spec section 23 are enforced
- All error codes from spec section 18 are returned correctly
