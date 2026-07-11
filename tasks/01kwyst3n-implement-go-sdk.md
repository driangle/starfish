---
title: "Implement Go SDK"
id: "01kwyst3n"
status: pending
priority: high
type: feature
tags: ["sdk", "golang"]
created_at: "2026-07-07"
phase: v0.1
---

# Implement Go SDK

## Objective

Implement the Go client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. Located in `sdks/golang/`.

## Tasks

- [ ] Set up Go module (go.mod, package structure)
- [ ] Define core types: `Frame`, `Error`, `Options`, `Delivery`
- [ ] Implement `Client` struct with gorilla/nhooyr WebSocket connection lifecycle
- [ ] Implement `client.hello` / `server.welcome` handshake
- [ ] Implement reconnection with `resumeToken` support
- [ ] Implement session management (`Join`, `Leave`)
- [ ] Implement topic pub/sub (`Subscribe`, `Unsubscribe`, `Publish`)
- [ ] Implement direct messaging (`Send`)
- [ ] Implement broadcast (`Broadcast` with `IncludeSelf` option)
- [ ] Implement presence (`SetPresence`, presence channel)
- [ ] Implement shared data operations (`Save`, `Get` with all ops and optimistic concurrency)
- [ ] Implement heartbeat (application-level `ping`/`pong`)
- [ ] Implement clock sync (`ClockSync`, `ClockNow`, `ClockOffset`)
- [ ] Implement event filtering (channel-based or callback)
- [ ] Implement message ID generation and `ReplyTo` correlation
- [ ] Implement transport selection logic
- [ ] Add payload size validation per protocol limits
- [ ] Write unit tests for message framing
- [ ] Write integration tests for session lifecycle and pub/sub
- [ ] Write integration tests for data operations

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
