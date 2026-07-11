---
id: "01kx5xcme"
title: "TS Server: Resume, heartbeat & system messages"
status: completed
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcm0"]
created_at: 2026-07-10
phase: v0.1
completed_at: 2026-07-11
---

# TS Server: Resume, heartbeat & system messages

## Objective

Implement connection resumption via resume tokens, application-level heartbeat with timeout detection, and system message handlers (ping/pong, clock sync, ack/nack routing).

## Context

Port from Go server's `resume.go`, `handler_connection.go` (resume path), and `handler_system.go`. Resume tokens allow clients to reconnect without losing session/topic/presence state. The heartbeat is application-level (not WebSocket ping/pong) with 2x timeout detection.

## Tasks

- [x] Implement `ResumeRegistry` class (token → held state map)
- [x] Generate `resumeToken` on successful handshake (format: `rt_XXXX`)
- [x] Hold client state on disconnect (session memberships, topic subscriptions, presence)
- [x] Defer `client.disconnected` broadcast until resume timeout fires (default 30s)
- [x] Restore state on `client.hello` with valid `resumeToken`
- [x] Invalidate old token and issue new one on successful resume
- [x] Reject invalid/expired tokens with `resume.invalid` / `resume.expired`
- [x] Implement heartbeat checker (2x interval timeout, default 15s interval → 30s timeout)
- [x] Disconnect client on heartbeat timeout
- [x] Implement `ping` → `pong` handler
- [x] Implement `clock.sync` → `clock.synced` handler (echo server timestamp)
- [x] Implement `ack` / `nack` routing to explicit `to` target
- [x] Write unit tests for resume lifecycle and heartbeat timeout

## Acceptance Criteria

- Successful handshake returns a `resumeToken`
- Disconnected client's state is held for 30s before cleanup
- `client.disconnected` is NOT broadcast immediately — only after timeout
- Reconnect with valid token restores all session/topic/presence state
- Used/expired tokens are rejected with appropriate error codes
- Heartbeat timeout (no activity for 2x interval) disconnects client
- `ping` → `pong`, `clock.sync` → `clock.synced` work correctly
- `ack`/`nack` are routed to the specified `to` target
