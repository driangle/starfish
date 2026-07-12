---
id: "01kx98k0e"
title: "Python SDK: Presence and Data Operations"
status: completed
priority: high
effort: medium
parent: "01kwyst2r"
phase: v0.1
dependencies: ["01kx98jye"]
tags: ["sdk", "python"]
created_at: 2026-07-11
completed_at: 2026-07-12
---

# Python SDK: Presence and Data Operations

## Objective

Implement presence tracking and shared data operations on top of the Python SDK core infrastructure. Reference the TypeScript SDK (`sdks/typescript/src/presence.ts`, `data.ts`) for API patterns.

## Tasks

- [x] Implement `presence.py` — `presence_set()`, presence tracking (dict of client_id → presence data), async iterator or callback for updates
- [x] Implement `data.py` — `save()` and `get()` with all ops (`replace`, `merge`, `set.add`/`set.remove`, `list.add`/`list.remove`, `counter.add`, `delete`)
- [x] Implement optimistic concurrency support (`expected_version`) with conflict error handling
- [x] Handle `data.changed` events for real-time data updates
- [x] Wire presence and data into `StarfishClient` facade
- [x] Write integration tests for presence updates
- [x] Write integration tests for data operations and conflict resolution

## Acceptance Criteria

- `presence_set()` sends presence data, presence state reflects all clients' presence
- Presence updates from other clients are received and tracked
- `save()` works with all data operations (replace, merge, set.*, list.*, counter.add, delete)
- `get()` retrieves current data values with version
- Optimistic concurrency with `expected_version` works, conflicts are properly reported
- `data.changed` events update local state in real-time
- Integration tests pass against the Go server
