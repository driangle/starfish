---
id: "01kx5xcmb"
title: "TS Server: Shared data store"
status: pending
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcm0"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: Shared data store

## Objective

Implement the server-authoritative shared data store with scoped key-value storage, versioning, all data operations, optimistic concurrency control, and change broadcasting.

## Context

Port from Go server's `data_store.go` and `handler_data.go`. The data store supports two scopes: `session` (shared, broadcasts `data.changed`) and `self` (private to the client, no broadcast). Each entry is versioned; `expectedVersion` enables optimistic concurrency.

## Tasks

- [ ] Implement `DataStore` class with `session` and `self` (client) scopes
- [ ] Implement versioned `DataEntry` (value + version counter)
- [ ] Implement `replace` operation (full value replacement)
- [ ] Implement `merge` operation (shallow merge of object keys)
- [ ] Implement `set.add` and `set.remove` operations
- [ ] Implement `list.add` and `list.remove` operations
- [ ] Implement `counter.add` operation
- [ ] Implement `delete` operation
- [ ] Implement `data.save` handler with operation dispatch
- [ ] Implement `data.get` handler → `data.value` response
- [ ] Implement optimistic concurrency (`expectedVersion` check → `data.conflict` on mismatch)
- [ ] Broadcast `data.changed` for session-scoped mutations only
- [ ] Validate data payload size (max 256KB)
- [ ] Reject cross-client `self` scope access with `data.forbidden`
- [ ] Write unit tests for all 8 operations and conflict detection

## Acceptance Criteria

- All 8 data operations work correctly (replace, merge, set.add/remove, list.add/remove, counter.add, delete)
- Each mutation increments the version counter
- `expectedVersion` mismatch returns `data.conflict` with current version
- `data.changed` is broadcast to session members for session-scoped mutations
- `self`-scoped data is private — other clients cannot read or write it
- Data values exceeding 256KB are rejected with `payload.too_large`
