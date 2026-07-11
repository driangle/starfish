---
title: "Implement Python SDK"
id: "01kwyst2r"
status: pending
priority: high
type: feature
tags: ["sdk", "python"]
created_at: "2026-07-07"
phase: v0.1
---

# Implement Python SDK

## Objective

Implement the Python client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. This SDK powers the TouchDesigner adapter and standalone Python clients. Located in `sdks/python/`.

## Tasks

- [ ] Set up Python project (pyproject.toml, package structure)
- [ ] Define core types/dataclasses: `StarfishFrame`, `StarfishError`, `Options`, `Delivery`
- [ ] Implement `StarfishClient` class with asyncio WebSocket connection lifecycle
- [ ] Implement `client.hello` / `server.welcome` handshake
- [ ] Implement reconnection with `resumeToken` support
- [ ] Implement session management (`join`, `leave`)
- [ ] Implement topic pub/sub (`subscribe`, `unsubscribe`, `publish`)
- [ ] Implement direct messaging (`send`)
- [ ] Implement broadcast (`broadcast` with `include_self` option)
- [ ] Implement presence (`presence_set`, presence callback/async iterator)
- [ ] Implement shared data operations (`save`, `get` with all ops and optimistic concurrency)
- [ ] Implement heartbeat (application-level `ping`/`pong`)
- [ ] Implement clock sync (`clock_sync`, `clock_now`, `clock_offset`)
- [ ] Implement event filtering (async iterators or callback-based)
- [ ] Implement message ID generation and `reply_to` correlation
- [ ] Implement transport selection logic
- [ ] Add payload size validation per protocol limits
- [ ] Write unit tests for message framing
- [ ] Write integration tests for session lifecycle and pub/sub
- [ ] Write integration tests for data operations

## Sub-tasks

- `01kx98jye` — Python SDK: Core Infrastructure and Connection
- `01kx98jzf` — Python SDK: Session, Topics, and Messaging (depends on 01kx98jye)
- `01kx98k0e` — Python SDK: Presence and Data Operations (depends on 01kx98jye)

## Acceptance Criteria

- Client can connect, handshake, join/leave sessions over WebSocket
- Topic pub/sub works with correct type rewriting
- Direct messaging and broadcast deliver correctly
- Presence updates are sent and received
- Shared data operations work with all ops including optimistic concurrency
- Clock sync estimates server time offset
- Reconnection with `resumeToken` restores state
- Idiomatic Python async/await API
- All payload size limits are enforced
