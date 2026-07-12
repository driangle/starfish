---
id: "01kx98jye"
title: "Python SDK: Core Infrastructure and Connection"
status: completed
priority: high
effort: large
parent: "01kwyst2r"
phase: v0.1
dependencies: []
tags: ["sdk", "python"]
created_at: 2026-07-11
completed_at: 2026-07-12
---

# Python SDK: Core Infrastructure and Connection

## Objective

Set up the Python SDK project and implement the core infrastructure: types, asyncio WebSocket transport, connection lifecycle (handshake, reconnection), heartbeat, clock sync, message ID generation, payload validation, and the event system. This is the foundation that all other Python SDK features build on. Reference the TypeScript SDK (`sdks/typescript/src/`) for API patterns and the protocol spec (`protocol/spec/starfish-v0.1.md`).

## Tasks

- [x] Set up Python project (`pyproject.toml` with `websockets` dependency, `sdks/python/starfish/` package structure)
- [x] Implement `types.py` — `StarfishFrame`, `StarfishError`, `Options`, `Delivery` dataclasses, all protocol message types
- [x] Implement `id.py` — monotonic counter message ID generation
- [x] Implement `limits.py` — payload size constants and validation helpers per protocol limits
- [x] Implement `emitter.py` — lightweight async event emitter / async iterator support
- [x] Implement `pending.py` — request/reply correlation (dict of id → asyncio.Future)
- [x] Implement `connection.py` — WebSocket connect, `client.hello`/`server.welcome` handshake, reconnection with `resumeToken` and exponential backoff
- [x] Implement `heartbeat.py` — ping/pong timer at server-specified interval
- [x] Implement `clock.py` — multi-sample sync, median offset, `clock_now()`, `clock_offset` property
- [x] Implement `events.py` — central frame dispatcher, event filtering with type/topic/from filters (async iterators or callback-based)
- [x] Implement `transport.py` — transport selection logic
- [x] Implement skeleton `client.py` — `StarfishClient` constructor, `connect()`, `disconnect()`
- [x] Create `__init__.py` barrel export
- [x] Add Makefile target `check-sdk-python`
- [x] Write unit tests for id, emitter, pending, clock, limits

## Acceptance Criteria

- `pyproject.toml` is valid and package is installable with `pip install -e .`
- Unit tests pass for core utilities (id, emitter, pending, clock, limits)
- `StarfishClient` can connect to Go server, complete handshake, and receive `server.welcome`
- Reconnection with `resumeToken` works (resumes state after disconnect)
- Heartbeat ping/pong keeps connection alive
- Clock sync estimates server time offset from multiple samples
- Event filtering works by type/topic/from
- All payload size limits are enforced
- Idiomatic Python async/await API throughout
