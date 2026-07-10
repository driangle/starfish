---
id: "01kx5xcm7"
title: "TS Server: Presence"
status: pending
priority: high
effort: small
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcm0"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: Presence

## Objective

Implement presence storage and throttled broadcasting. Each client can set arbitrary presence data, and the server broadcasts `presence.updated` to the session at most once per 50ms per client (latest value wins).

## Context

Port from Go server's `handler_presence.go` and `presence.go`. The `PresenceThrottle` is a per-session ticker goroutine (50ms interval) that collects pending updates and flushes them as a single broadcast. In TypeScript, use `setInterval` or similar.

## Tasks

- [ ] Implement per-client presence storage on the `Session`
- [ ] Implement `presence.set` handler that enqueues into throttle
- [ ] Implement `PresenceThrottle` class (50ms interval, latest-value-wins per client)
- [ ] Broadcast `presence.updated` with all pending changes on each tick
- [ ] Validate presence payload size (max 8KB)
- [ ] Clean up presence on client disconnect
- [ ] Stop throttle timer when session is destroyed
- [ ] Write unit tests for throttle behavior

## Acceptance Criteria

- `presence.set` stores presence data for the calling client
- `presence.updated` is broadcast at most every 50ms (20Hz) per session
- Multiple rapid `presence.set` calls coalesce — only latest value is broadcast
- Presence data exceeding 8KB is rejected with `payload.too_large`
- Client disconnect removes their presence from the session
