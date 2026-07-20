---
id: "01ky0fjsw"
title: "Implement auth validation in the Go server"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "go-server"]
created_at: 2026-07-20
---

# Implement auth validation in the Go server

## Objective

Implement the optional authentication handshake defined in protocol spec
`protocol/spec/starfish-v0.1.md` §3.4 in the Go server (`servers/golang/`). Add a
pluggable validator so server-SDK users define custom auth logic, keep servers
without a validator fully backwards compatible, and ship a secure-by-default
built-in token validator.

## Tasks

- [ ] Add `AuthValidator func(AuthContext) bool` to `Config` in `server.go`; default unset in `DefaultConfig` (auth off). `AuthContext` carries the parsed hello `auth` object + client identity (name, role, meta).
- [ ] Add an `Auth` field to `helloPayload` in `handler_connection.go` and validate in the fresh-connection branch before `c.authenticated = true` (~line 141): no/`none` auth ⇒ `ErrAuthRequired`; validator returns false ⇒ `ErrAuthFailed`; both sent as welcome-error frames via `NewErrorFrame(..., "client", "welcome", ...)`, client not registered.
- [ ] Leave the resume branch un-challenged (resumeToken is the credential).
- [ ] Add `auth: { required: <validator != nil> }` to the welcome payload.
- [ ] Add exported `TokenValidator(expected string) AuthValidator` using `crypto/subtle.ConstantTimeCompare`.
- [ ] Tests: validator set ⇒ rejects missing creds (`auth.required`), rejects wrong token (`auth.failed`), accepts correct token; no validator ⇒ accepts without creds; unit-test `TokenValidator`.

## Acceptance Criteria

- A Go server configured with a validator rejects unauthenticated/invalid clients with `auth.required`/`auth.failed` during the handshake; gated commands then fail with `auth.required`.
- A Go server with no validator accepts clients without credentials, unchanged.
- `go test ./...` passes in `servers/golang/`.
