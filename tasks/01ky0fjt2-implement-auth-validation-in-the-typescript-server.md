---
id: "01ky0fjt2"
title: "Implement auth validation in the TypeScript server"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "ts-server"]
created_at: 2026-07-20
---

# Implement auth validation in the TypeScript server

## Objective

Implement the optional authentication handshake defined in protocol spec
`protocol/spec/starfish-v0.2.md` §3.4 in the TypeScript server
(`servers/typescript/`). Add a pluggable (optionally async) validator, keep
no-validator servers backwards compatible, and ship a secure-by-default token
validator.

## Tasks

- [ ] Add `authValidator?: (ctx: AuthContext) => boolean | Promise<boolean>` to `StarfishConfig` in `config.ts`; default unset in `defaultConfig`. `AuthContext = { auth, client: { name, role, meta } }`.
- [ ] In `handler_connection.ts` make `handleFreshHello`/`handleClientHello` async and validate before `client.authenticated = true` (~line 123): no/`none` auth ⇒ `ERR_AUTH_REQUIRED`; validator false ⇒ `ERR_AUTH_FAILED`; both via `createErrorFrame(..., "client", "welcome")`, client not registered.
- [ ] Dispatch the hello handler fire-and-forget from `handler.ts:41` (responses are sent via `sendFrame`, so `dispatch` needs no signature change). Leave resume un-challenged.
- [ ] Add `auth: { required: <validator set> }` to the welcome payload.
- [ ] Add exported `tokenValidator(expected: string)` using `crypto.timingSafeEqual` (length-guarded).
- [ ] Tests in `handler_connection.test.ts` / `handler.test.ts`: rejects missing creds, rejects wrong token, accepts correct token, no-validator backwards-compat; unit-test `tokenValidator`.

## Acceptance Criteria

- A configured server rejects unauthenticated/invalid clients with `auth.required`/`auth.failed`; a server with no validator is unchanged.
- `npm run check && npm run lint && npm run test` pass in `servers/typescript/`.
