---
id: "01kx1scvj"
title: "TypeScript SDK: Core Infrastructure and Connection"
status: completed
priority: high
effort: large
parent: "01kwyst27"
dependencies: []
tags: ["sdk", "typescript"]
created_at: 2026-07-08
completed_at: 2026-07-08
phase: v0.1
---

# TypeScript SDK: Core Infrastructure and Connection

## Objective

Set up the TypeScript SDK project and implement the core infrastructure: types, WebSocket transport, connection lifecycle (handshake, reconnection), heartbeat, clock sync, and the event system. This is the foundation that all other SDK features build on.

## Tasks

- [x] Create package.json (@starfish/client, ESM, zero runtime deps)
- [x] Create tsconfig.json (ES2022, strict, declaration)
- [x] Implement `types.ts` — StarfishFrame, StarfishError, Options, client options, all protocol types
- [x] Implement `id.ts` — monotonic counter message ID generation
- [x] Implement `transport.ts` — WebSocketLike interface, factory with globalThis fallback
- [x] Implement `emitter.ts` — lightweight Observable<T> and EventStream<T>
- [x] Implement `limits.ts` — payload size constants and validation helpers
- [x] Implement `pending.ts` — request/reply correlation (Map<id, Promise>)
- [x] Implement `connection.ts` — WebSocket connect, client.hello/server.welcome handshake, reconnection with resumeToken and exponential backoff
- [x] Implement `heartbeat.ts` — ping/pong timer at server-specified interval
- [x] Implement `clock.ts` — multi-sample sync, median offset, now(), at() scheduler
- [x] Implement `events.ts` — central frame dispatcher, events$(filter) with type/topic/from filtering
- [x] Implement skeleton `client.ts` — StarfishClient constructor, connect(), disconnect(), connection$ observable
- [x] Create `index.ts` barrel export
- [x] Add Makefile target `check-sdk-typescript`
- [x] Write unit tests for id, emitter, pending, clock, limits

## Acceptance Criteria

- `tsc --noEmit` passes with zero errors
- Unit tests pass for core utilities (id, emitter, pending, clock, limits)
- StarfishClient can connect to Go server, complete handshake, and receive server.welcome
- Reconnection with resumeToken works (resumes state after disconnect)
- Heartbeat ping/pong keeps connection alive
- Clock sync estimates server time offset from multiple samples
- events$ stream filters incoming frames by type/topic/from
