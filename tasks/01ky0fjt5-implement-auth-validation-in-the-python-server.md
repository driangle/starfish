---
id: "01ky0fjt5"
title: "Implement auth validation in the Python server"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "py-server"]
created_at: 2026-07-20
---

# Implement auth validation in the Python server

## Objective

Implement the optional authentication handshake defined in protocol spec
`protocol/spec/starfish-v0.2.md` §3.4 in the Python server
(`servers/python/`). Add a pluggable (sync or async) validator, keep
no-validator servers backwards compatible, and ship a secure-by-default token
validator.

## Tasks

- [ ] Add `auth_validator: Callable[[AuthContext], bool | Awaitable[bool]] | None` to `StarfishConfig` in `config.py`; default `None` (auth off). `AuthContext` carries the parsed hello `auth` + client identity.
- [ ] In `handler_connection.py` validate in `_handle_fresh_hello` before `client.authenticated = True` (~line 108): no/`none` auth ⇒ `ERR_AUTH_REQUIRED`; validator false ⇒ `ERR_AUTH_FAILED`; both via `create_error_frame(..., "client", "welcome")`, client not registered.
- [ ] Support an async validator: run the fresh-hello auth step as an `asyncio` task (dispatch stays sync; responses go via `client.send_frame`). Leave resume un-challenged.
- [ ] Add `auth: { "required": <validator set> }` to the welcome payload.
- [ ] Add exported `token_validator(expected: str)` using `hmac.compare_digest`.
- [ ] Tests in `tests/test_handler_connection.py`: rejects missing creds, rejects wrong token, accepts correct token, no-validator backwards-compat; unit-test `token_validator`.

## Acceptance Criteria

- A configured server rejects unauthenticated/invalid clients with `auth.required`/`auth.failed`; a server with no validator is unchanged.
- The Python server test suite passes.
