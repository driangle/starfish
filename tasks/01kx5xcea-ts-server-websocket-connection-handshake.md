---
id: "01kx5xcea"
title: "TS Server: WebSocket server & connection handshake"
status: pending
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xce9"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: WebSocket server & connection handshake

## Objective

Implement the WebSocket server, client connection management, and the `client.hello` → `server.welcome` handshake. This establishes the foundation that all other message handlers build on.

## Context

Port from Go server's `client.go` (ReadPump/WritePump pattern), `hub.go` (client registry), and `handler_connection.go`. Use the `ws` npm package for WebSocket support.

## Tasks

- [ ] Implement `Client` class with WebSocket read loop and buffered write queue
- [ ] Implement `Hub` class as the central coordinator (client registry, HTTP handler)
- [ ] Implement frame validation on incoming messages (v=1, id required, type required)
- [ ] Implement `client.hello` handler with `clientId` assignment
- [ ] Implement `server.welcome` response with server capabilities
- [ ] Implement `from` field overwrite on all outbound frames (security rule)
- [ ] Implement `requireAuth` guard (reject messages before handshake)
- [ ] Implement graceful client disconnect and cleanup
- [ ] Create server entry point (`main.ts` or `index.ts`) with CLI arg for port
- [ ] Write unit tests for frame validation and auth guard

## Acceptance Criteria

- Server starts and accepts WebSocket connections on configurable port
- `client.hello` produces a valid `server.welcome` with unique `clientId`
- Messages sent before `client.hello` are rejected with `auth.required`
- Invalid frames (missing v, id, or type) are rejected with `protocol.invalid_frame`
- `from` field is always overwritten by server on outbound frames
- Clean disconnect removes client from Hub
