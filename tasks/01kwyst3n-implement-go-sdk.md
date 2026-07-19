---
title: "Implement Go SDK"
id: "01kwyst3n"
status: completed
priority: high
type: feature
tags: ["sdk", "golang"]
created_at: "2026-07-07"
phase: v0.2
completed_at: 2026-07-19
---

# Implement Go SDK

## Objective

Implement the Go client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. Located in `sdks/golang/`.

## Tasks

- [x] Set up Go module (go.mod, package structure)
- [x] Define core types: `Frame`, `Error`, `Options`, `Delivery`
- [x] Implement `Client` struct with gorilla/nhooyr WebSocket connection lifecycle
- [x] Implement `client.hello` / `server.welcome` handshake
- [x] Implement reconnection with `resumeToken` support
- [x] Implement session management (`Join`, `Leave`)
- [x] Implement topic pub/sub (`Subscribe`, `Unsubscribe`, `Publish`)
- [x] Implement direct messaging (`Send`)
- [x] Implement broadcast (`Broadcast` with `IncludeSelf` option)
- [x] Implement presence (`SetPresence`, presence channel)
- [x] Implement shared data operations (`Save`, `Get` with all ops and optimistic concurrency)
- [x] Implement heartbeat (application-level `ping`/`pong`)
- [x] Implement clock sync (`ClockSync`, `ClockNow`, `ClockOffset`)
- [x] Implement event filtering (channel-based or callback)
- [x] Implement message ID generation and `ReplyTo` correlation
- [x] Implement transport selection logic
- [x] Add payload size validation per protocol limits
- [x] Write unit tests for message framing
- [x] Write integration tests for session lifecycle and pub/sub
- [x] Write integration tests for data operations

## Acceptance Criteria

- Client can connect, handshake, join/leave sessions over WebSocket
- Topic pub/sub works with correct type rewriting
- Direct messaging and broadcast deliver correctly
- Presence updates are sent and received
- Shared data operations work with all ops including optimistic concurrency
- Clock sync estimates server time offset
- Reconnection with `resumeToken` restores state
- Idiomatic Go API with channels and context support
- All payload size limits are enforced
