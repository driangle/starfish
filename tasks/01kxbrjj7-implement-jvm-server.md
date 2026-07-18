---
title: "Implement JVM Server"
id: "01kxbrjj7"
status: pending
priority: low
type: feature
tags: ["server", "jvm"]
created_at: "2026-07-12"
phase: v0.3
---

# Implement JVM Server

## Objective

Implement a JVM-based server for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. The exact JVM language (Kotlin, Java, Scala, etc.) is TBD — choose the best fit during implementation. The server is the authoritative session coordinator and WebSocket router. Located in `servers/jvm/` (or language-specific directory once decided).

## Tasks

- [ ] Evaluate JVM language choice (Kotlin, Java, Scala) and document decision
- [ ] Set up project with build tooling (Gradle/Maven, dependencies, package structure)
- [ ] Define server-side types matching the protocol spec
- [ ] Implement WebSocket server with connection management
- [ ] Implement `client.hello` → `server.welcome` handshake with `clientId` assignment
- [ ] Implement `resumeToken` generation, validation, and state hold/restore
- [ ] Implement resume timeout with `client.disconnected` cleanup
- [ ] Implement session management (create on join, destroy when empty)
- [ ] Implement `session.join` / `session.leave` with `client.connected` / `client.disconnected` events
- [ ] Implement topic subscription tracking
- [ ] Implement `topic.publish` → `topic.message` routing with type rewriting
- [ ] Implement `client.send` → `client.message` direct message routing
- [ ] Implement `session.broadcast` routing (exclude sender unless `includeSelf`)
- [ ] Implement presence storage and `presence.updated` broadcast with 50ms throttling
- [ ] Implement shared data store (scoped key-value with versioning)
- [ ] Implement all data operations (replace, merge, set.*, list.*, counter.add, delete)
- [ ] Implement optimistic concurrency (`expectedVersion` / `data.conflict`)
- [ ] Implement `data.changed` broadcast on mutations
- [ ] Implement application-level heartbeat (`ping`/`pong`) with 2x timeout detection
- [ ] Implement clock sync (`clock.sync` → `clock.synced`)
- [ ] Implement acknowledgement routing (`ack`/`nack`)
- [ ] Implement WebRTC signaling relay (offer/answer/ICE forwarding)
- [ ] Implement `topic.peers` subscription map distribution
- [ ] Enforce security rules (session membership, `from` overwrite, scope enforcement)
- [ ] Enforce payload size limits per spec section 24
- [ ] Implement error responses with all error codes from spec section 18
- [ ] Write unit tests for session and routing logic
- [ ] Write integration tests for full client-server flows
- [ ] Write integration tests for data operations and conflict resolution

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
- Idiomatic JVM implementation (coroutines/reactive depending on language choice)
