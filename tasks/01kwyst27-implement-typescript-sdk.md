---
title: "Implement TypeScript SDK"
id: "01kwyst27"
status: pending
priority: high
type: feature
tags: ["sdk", "typescript"]
created_at: "2026-07-07"
---

# Implement TypeScript SDK

## Objective

Implement the TypeScript client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. This is the primary SDK that browser-based adapters (p5.js, Three.js) will build on. Located in `sdks/typescript/`.

## Tasks

- [ ] Set up TypeScript project with build tooling (tsconfig, bundler, package.json)
- [ ] Define core types: `StarfishFrame`, `StarfishError`, `Options`, `Delivery`
- [ ] Implement `StarfishClient` class with WebSocket connection lifecycle
- [ ] Implement `client.hello` / `server.welcome` handshake
- [ ] Implement reconnection with `resumeToken` support
- [ ] Implement session management (`join`, `leave`)
- [ ] Implement topic pub/sub (`subscribe`, `unsubscribe`, `publish`, `topic$`)
- [ ] Implement direct messaging (`send`)
- [ ] Implement broadcast (`broadcast` with `includeSelf` option)
- [ ] Implement presence (`presence.set`, `presence$`)
- [ ] Implement shared data operations (`save`, `get` with all ops and optimistic concurrency)
- [ ] Implement heartbeat (application-level `ping`/`pong`)
- [ ] Implement clock sync (`clock.sync`, `clock.now`, `clock.offset`, `at`)
- [ ] Implement event stream filtering (`events$` with type/topic/from filters)
- [ ] Implement observable streams (`clients$`, `peers$`)
- [ ] Implement message ID generation and `replyTo` correlation
- [ ] Implement transport selection logic (`options.delivery.preferTransport`)
- [ ] Add WebRTC DataChannel support (control, stream, state channels)
- [ ] Implement RTC signaling flow (offer/answer/ICE via WebSocket)
- [ ] Implement RTC topic routing with subscription map validation
- [ ] Add payload size validation per protocol limits
- [ ] Write unit tests for message framing and type rewriting
- [ ] Write integration tests for session lifecycle and pub/sub
- [ ] Write integration tests for data operations and conflict resolution

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
