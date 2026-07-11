---
title: "Implement Swift SDK"
id: "01kx31rc3"
status: pending
priority: high
type: feature
tags: ["sdk", "swift", "ios"]
created_at: "2026-07-09"
phase: v0.1
---

# Implement Swift SDK

## Objective

Implement a native Swift SDK (`StarfishClient`) that provides a complete client library for the Starfish realtime protocol, mirroring the feature set of the existing TypeScript SDK (`@starfish/client`). The SDK should feel idiomatic to Swift developers, leveraging async/await, Combine publishers, and Swift concurrency patterns. Target Swift 5.9+ with support for iOS 16+, macOS 13+, and Linux (via Swift on Server).

## Tasks

- [ ] Set up Swift package (`Package.swift`) with project structure, dependencies (e.g., `swift-nio-websocket-client` or `URLSessionWebSocketTask`), and build targets
- [ ] Implement WebSocket transport layer with connection lifecycle, reconnection with exponential backoff, and protocol handshake (`client.hello` / `server.welcome`)
- [ ] Implement session management: join/leave sessions, track connected clients and peers via `AsyncStream` or Combine publishers
- [ ] Implement pub/sub topics: subscribe/unsubscribe, publish messages, per-topic event streams
- [ ] Implement direct messaging: send to specific clients, broadcast to peers
- [ ] Implement presence: set and observe presence data for connected clients
- [ ] Implement shared data: save/get with scoped operations (self/session), support data operations (replace, merge, set add/remove, list add/remove, counter add, delete), observable change streams per key
- [ ] Implement clock/timing: server time synchronization, scheduled callbacks at specific server times
- [ ] Implement event system: global event stream with filtering by type, topic, and sender
- [ ] Implement WebRTC support: peer-to-peer data channels, SDP offer/answer, ICE candidate handling, per-peer state tracking
- [ ] Add comprehensive unit tests for all modules
- [ ] Add integration tests against a running Starfish server
- [ ] Write API documentation with DocC and usage examples in README

## Acceptance Criteria

- Swift package builds successfully on macOS and Linux
- All core features (connection, sessions, topics, messaging, presence, shared data, clock, events) are functional and tested
- API uses idiomatic Swift patterns: async/await for one-shot operations, `AsyncStream`/Combine for reactive streams, value types where appropriate
- Unit test coverage for all public API surface
- Integration tests pass against a running Starfish server
- WebRTC data channels work on iOS/macOS (platform-conditional compilation for Linux where WebRTC is unavailable)
- README with quick-start guide and API overview
