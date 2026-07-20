---
title: "Add optional authentication and authorization to the protocol"
id: "01kxh8eby"
status: completed
priority: high
type: feature
tags: ["protocol", "security"]
created_at: "2026-07-14"
completed_at: 2026-07-20
---

# Add optional authentication and authorization to the protocol

## Objective

Add an optional authentication and authorization layer to the Starfish protocol. Currently, `client.hello` sends `"auth": { "type": "none" }` with no mechanism for servers to require credentials. Servers should be able to require authentication, and clients must comply when it is required. When a server does not require auth, the current no-auth flow should continue to work unchanged.

## Scope

This task now covers the **protocol spec design only**. The per-project
implementation is tracked in follow-up tasks (see below).

## Tasks

Protocol spec (this task — `protocol/spec/starfish-v0.1.md` §3.4):

- [x] Design the auth handshake extension to the protocol spec (auth types, token exchange, rejection flow)
- [x] Define supported auth types (e.g. `none`, `token`, `shared-secret`) and their message payloads
- [x] Add auth fields to `client.hello` and `server.welcome` messages in the protocol spec
- [x] Add an `auth.required` / `auth.failed` error message type for rejected connections

Implementation — tracked by follow-up tasks (each includes its own auth tests):

- [ ] Go server — `01ky0fjsw`
- [ ] TypeScript server — `01ky0fjt2`
- [ ] Python server — `01ky0fjt5`
- [ ] TypeScript SDK — `01ky0fjt8`
- [ ] Python SDK — `01ky0fjtb`
- [ ] Go SDK — `01ky0fjte`
- [ ] Swift SDK — `01ky0fjth`
- [ ] Documentation — `01ky0fjtm`

## Acceptance Criteria

- Servers can be configured to require authentication; when enabled, unauthenticated clients are rejected with a clear error
- Clients can provide auth credentials (e.g. a token) in the `client.hello` message
- When a server does not require auth, clients connect without credentials as before (fully backwards compatible)
- All SDKs (TypeScript, Python, Go, Swift) and both servers (TypeScript, Go) support the auth flow
- The protocol spec documents the auth message types, fields, and handshake sequence
- Auth is extensible to support multiple auth strategies (token, shared-secret, etc.)
