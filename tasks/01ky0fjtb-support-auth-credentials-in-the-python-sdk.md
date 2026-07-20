---
id: "01ky0fjtb"
title: "Support auth credentials in the Python SDK"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "py-sdk"]
created_at: 2026-07-20
---

# Support auth credentials in the Python SDK

## Objective

Ensure the Python SDK (`sdks/python/`) supports the auth handshake from protocol
spec `protocol/spec/starfish-v0.1.md` §3.4: send credentials in `client.hello`
and surface `auth.required`/`auth.failed` rejections clearly.

## Tasks

- [ ] Confirm `auth` is sent in `_do_handshake` (`connection.py:127`) and that `AuthOptions` (`types.py:82`) allows the token (broaden for custom scheme fields if needed).
- [ ] Verify a welcome-error frame rejects the handshake — the pending resolver (`pending.py:59`) already raises `StarfishRequestError` with `code="auth.failed"`/`"auth.required"`. Add a test asserting the surfaced code.
- [ ] Test: connect with a valid token to an auth-required server succeeds; connect without a token raises `StarfishRequestError` with `code == "auth.required"`.

## Acceptance Criteria

- A client can pass an auth token and connect to an auth-required server; a missing/invalid token raises with the correct `auth.*` code.
- The Python SDK test suite passes.
