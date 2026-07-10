---
id: "01kx5xcm0"
title: "TS Server: Session management"
status: pending
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcea"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: Session management

## Objective

Implement session lifecycle management: creating sessions on first join, tracking membership, handling join/leave, broadcasting connection events, and destroying sessions when empty.

## Context

Port from Go server's `session.go` and `handler_session.go`. Sessions are identified by string IDs provided by clients. The `requireSession` guard is shared across all session-scoped handlers.

## Tasks

- [ ] Implement `Session` class (client set, topic subscriptions map, close/cleanup)
- [ ] Implement session registry in `Hub` (create-on-first-join, destroy-when-empty)
- [ ] Implement `session.join` handler → `session.joined` response
- [ ] Implement `session.leave` handler → `session.left` response
- [ ] Broadcast `client.connected` to session members on join
- [ ] Broadcast `client.disconnected` to session members on leave/disconnect
- [ ] Implement `requireSession` guard for session-scoped handlers
- [ ] Handle client disconnect mid-session (leave all sessions, emit events)
- [ ] Write unit tests for session lifecycle

## Acceptance Criteria

- Sessions are created dynamically when first client joins
- Sessions are destroyed when last client leaves
- `session.join` returns `session.joined` and broadcasts `client.connected`
- `session.leave` returns `session.left` and broadcasts `client.disconnected`
- Messages to session-scoped handlers without joining are rejected
- Client disconnect properly leaves all sessions and fires events
