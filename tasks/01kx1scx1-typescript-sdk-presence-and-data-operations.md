---
id: "01kx1scx1"
title: "TypeScript SDK: Presence and Data Operations"
status: completed
priority: high
effort: medium
parent: "01kwyst27"
dependencies: ["01kx1scvj"]
tags: ["sdk", "typescript"]
created_at: 2026-07-08
completed_at: 2026-07-08
---

# TypeScript SDK: Presence and Data Operations

## Objective

Implement presence tracking and shared data operations on top of the SDK core infrastructure.

## Tasks

- [x] Implement `presence.ts` — presence.set(), presence$ observable (map of clientId -> presence data)
- [x] Implement `data.ts` — save() and get() with all ops (replace, merge, set.add/remove, list.add/remove, counter.add, delete)
- [x] Implement optimistic concurrency support (expectedVersion) with conflict error handling
- [x] Handle data.changed events for real-time data updates
- [x] Wire presence and data into StarfishClient facade
- [x] Write unit tests for data op validation and presence state management

## Acceptance Criteria

- presence.set() sends presence data, presence$ reflects all clients' presence
- Presence updates from other clients are received and tracked
- save() works with all data operations (replace, merge, set.*, list.*, counter.add, delete)
- get() retrieves current data values with version
- Optimistic concurrency with expectedVersion works, conflicts are properly reported
- data.changed events update local state in real-time
