---
title: "Implement TypeScript SDK"
id: "01kwyst27"
status: completed
priority: high
type: feature
tags: ["sdk", "typescript"]
created_at: "2026-07-07"
completed_at: 2026-07-09
phase: v0.1
---

# Implement TypeScript SDK

## Objective

Implement the TypeScript client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. This is the primary SDK that browser-based adapters (p5.js, Three.js) will build on. Located in `sdks/typescript/`.

## Tasks

- [x] Set up TypeScript project with build tooling (tsconfig, bundler, package.json)
- [x] Define core types: `StarfishFrame`, `StarfishError`, `Options`, `Delivery`
- [x] Implement `StarfishClient` class with WebSocket connection lifecycle
- [x] Implement `client.hello` / `server.welcome` handshake
- [x] Implement reconnection with `resumeToken` support
- [x] Implement session management (`join`, `leave`)
- [x] Implement topic pub/sub (`subscribe`, `unsubscribe`, `publish`, `topic$`)
- [x] Implement direct messaging (`send`)
- [x] Implement broadcast (`broadcast` with `includeSelf` option)
- [x] Implement presence (`presence.set`, `presence$`)
- [x] Implement shared data operations (`save`, `get` with all ops and optimistic concurrency)
- [x] Implement heartbeat (application-level `ping`/`pong`)
- [x] Implement clock sync (`clock.sync`, `clock.now`, `clock.offset`, `at`)
- [x] Implement event stream filtering (`events$` with type/topic/from filters)
- [x] Implement observable streams (`clients$`, `peers$`)
- [x] Implement message ID generation and `replyTo` correlation
- [x] Implement transport selection logic (`options.delivery.preferTransport`)
- [x] Add WebRTC DataChannel support (control, stream, state channels)
- [x] Implement RTC signaling flow (offer/answer/ICE via WebSocket)
- [x] Implement RTC topic routing with subscription map validation
- [x] Add payload size validation per protocol limits
- [x] Write unit tests for message framing and type rewriting
- [x] Write integration tests for session lifecycle and pub/sub
- [x] Write integration tests for data operations and conflict resolution

## Sub-tasks

- `01kx1scvj` — TypeScript SDK: Core Infrastructure and Connection
- `01kx1scwg` — TypeScript SDK: Session, Topics, and Messaging (depends on 01kx1scvj)
- `01kx1scx1` — TypeScript SDK: Presence and Data Operations (depends on 01kx1scvj)
- `01kx30x5f` — TypeScript SDK: WebRTC Signaling and Peer Connections
- `01kx30x9d` — TypeScript SDK: Transport Selection and RTC Topic Routing (depends on 01kx30x5f)

## Acceptance Criteria

- Client can connect, handshake, join/leave sessions over WebSocket
- Topic pub/sub works with correct type rewriting (publish → message)
- Direct messaging and broadcast deliver correctly
- Presence updates are sent and received
- Shared data operations work with all ops (replace, merge, set.*, list.*, counter.add, delete)
- Optimistic concurrency with `expectedVersion` works correctly
- Clock sync estimates server time offset from multiple samples
- Reconnection with `resumeToken` restores state
- WebRTC peer connections can be established via signaling
- RTC DataChannels (control, stream, state) work with correct configuration
- API matches the SDK reference in spec section 22
- All payload size limits are enforced
