---
id: "01ky0fjte"
title: "Support auth credentials in the Go SDK"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "go-sdk"]
created_at: 2026-07-20
---

# Support auth credentials in the Go SDK

## Objective

Ensure the Go SDK (`sdks/golang/`) supports the auth handshake from protocol
spec `protocol/spec/starfish-v0.1.md` §3.4: send credentials in `client.hello`
and surface `auth.required`/`auth.failed` rejections clearly.

## Tasks

- [ ] Confirm `auth` is sent in `NewHelloFrame` (`handshake.go:46`) and that `AuthOptions` (`types.go:65`) allows the token (broaden for custom scheme fields if needed). Consider omitting the empty `token` from the emitted map.
- [ ] Verify a welcome-error frame is surfaced — `ParseWelcome`/`sendAndWait` already map `payload.status == "error"` to a `*StarfishError`/`RequestError` with `Code == "auth.failed"`/`"auth.required"`. Add a test asserting the surfaced code.
- [ ] Test: connect with a valid token to an auth-required server succeeds; connect without a token returns an error with `Code == "auth.required"`.

## Acceptance Criteria

- A client can pass an auth token and connect to an auth-required server; a missing/invalid token returns the correct `auth.*` code.
- `go test ./...` passes in `sdks/golang/`.
