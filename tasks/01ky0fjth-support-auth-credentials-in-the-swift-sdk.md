---
id: "01ky0fjth"
title: "Support auth credentials in the Swift SDK"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "swift-sdk"]
created_at: 2026-07-20
---

# Support auth credentials in the Swift SDK

## Objective

Ensure the Swift SDK (`sdks/swift/`) supports the auth handshake from protocol
spec `protocol/spec/starfish-v0.2.md` §3.4: send credentials in `client.hello`
and surface `auth.required`/`auth.failed` rejections clearly. **Requires a bug
fix** — Swift currently detects errors differently from the other SDKs.

## Tasks

- [ ] Confirm `auth` is sent in `buildHelloPayload` (`Connection.swift:165`) and that `AuthConfig` (`Types.swift:261`) allows the token.
- [ ] Fix `PendingRequests.swift:48`: it only detects errors via `header.resource == "error"`, which does NOT match a welcome-error frame (`resource: "client"`, `payload.status: "error"`). Add detection of `payload.status == "error"` and surface `payload.error.code` so `auth.*` codes reach the caller. (This gap affects all payload-status errors, not just auth.)
- [ ] Test: connect with a valid token to an auth-required server succeeds; connect without a token throws surfacing `auth.required`.

## Acceptance Criteria

- A client can pass an auth token and connect to an auth-required server; a missing/invalid token throws surfacing the correct `auth.*` code.
- `swift test` passes in `sdks/swift/`.
