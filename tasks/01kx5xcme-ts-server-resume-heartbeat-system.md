---
id: "01kx5xcme"
title: "TS Server: Resume, heartbeat & system messages"
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

# TS Server: Resume, heartbeat & system messages

## Objective

Implement connection resumption via resume tokens, application-level heartbeat with timeout detection, and system message handlers (ping/pong, clock sync, ack/nack routing).

## Context

Port from Go server's `resume.go`, `handler_connection.go` (resume path), and `handler_system.go`. Resume tokens allow clients to reconnect without losing session/topic/presence state. The heartbeat is application-level (not WebSocket ping/pong) with 2x timeout detection.

## Tasks

- [ ] Implement `ResumeRegistry` class (token → held state map)
- [ ] Generate `resumeToken` on successful handshake (format: `rt_XXXX`)
- [ ] Hold client state on disconnect (session memberships, topic subscriptions, presence)
- [ ] Defer `client.disconnected` broadcast until resume timeout fires (default 30s)
- [ ] Restore state on `client.hello` with valid `resumeToken`
- [ ] Invalidate old token and issue new one on successful resume
- [ ] Reject invalid/expired tokens with `resume.invalid` / `resume.expired`
- [ ] Implement heartbeat checker (2x interval timeout, default 15s interval → 30s timeout)
- [ ] Disconnect client on heartbeat timeout
- [ ] Implement `ping` → `pong` handler
- [ ] Implement `clock.sync` → `clock.synced` handler (echo server timestamp)
- [ ] Implement `ack` / `nack` routing to explicit `to` target
- [ ] Write unit tests for resume lifecycle and heartbeat timeout

## Acceptance Criteria

- Successful handshake returns a `resumeToken`
- Disconnected client's state is held for 30s before cleanup
- `client.disconnected` is NOT broadcast immediately — only after timeout
- Reconnect with valid token restores all session/topic/presence state
- Used/expired tokens are rejected with appropriate error codes
- Heartbeat timeout (no activity for 2x interval) disconnects client
- `ping` → `pong`, `clock.sync` → `clock.synced` work correctly
- `ack`/`nack` are routed to the specified `to` target
