---
title: "Add optional authentication and authorization to the protocol"
id: "01kxh8eby"
status: pending
priority: high
type: feature
tags: ["protocol", "security"]
created_at: "2026-07-14"
---

# Add optional authentication and authorization to the protocol

## Objective

Add an optional authentication and authorization layer to the Starfish protocol. Currently, `client.hello` sends `"auth": { "type": "none" }` with no mechanism for servers to require credentials. Servers should be able to require authentication, and clients must comply when it is required. When a server does not require auth, the current no-auth flow should continue to work unchanged.

## Tasks

- [ ] Design the auth handshake extension to the protocol spec (auth types, token exchange, rejection flow)
- [ ] Define supported auth types (e.g. `none`, `token`, `shared-secret`) and their message payloads
- [ ] Add auth fields to `client.hello` and `server.welcome` messages in the protocol spec
- [ ] Add an `auth.required` / `auth.failed` error message type for rejected connections
- [ ] Implement server-side auth validation in the TypeScript server
- [ ] Implement server-side auth validation in the Go server
- [ ] Update the TypeScript SDK to support sending auth credentials in `client.hello`
- [ ] Update the Python SDK to support sending auth credentials in `client.hello`
- [ ] Update the Go SDK to support sending auth credentials in `client.hello`
- [ ] Update the Swift SDK to support sending auth credentials in `client.hello`
- [ ] Add tests for auth-required server rejecting unauthenticated clients
- [ ] Add tests for auth-required server accepting authenticated clients
- [ ] Add tests for no-auth server accepting clients without credentials (backwards compatibility)
- [ ] Document the authentication flow and configuration options

## Acceptance Criteria

- Servers can be configured to require authentication; when enabled, unauthenticated clients are rejected with a clear error
- Clients can provide auth credentials (e.g. a token) in the `client.hello` message
- When a server does not require auth, clients connect without credentials as before (fully backwards compatible)
- All SDKs (TypeScript, Python, Go, Swift) and both servers (TypeScript, Go) support the auth flow
- The protocol spec documents the auth message types, fields, and handshake sequence
- Auth is extensible to support multiple auth strategies (token, shared-secret, etc.)
