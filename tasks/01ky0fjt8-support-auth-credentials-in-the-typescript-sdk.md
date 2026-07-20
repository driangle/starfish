---
id: "01ky0fjt8"
title: "Support auth credentials in the TypeScript SDK"
status: pending
priority: high
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "ts-sdk"]
created_at: 2026-07-20
---

# Support auth credentials in the TypeScript SDK

## Objective

Ensure the TypeScript SDK (`sdks/typescript/`) supports the auth handshake from
protocol spec `protocol/spec/starfish-v0.2.md` §3.4: send credentials in
`client.hello` and surface `auth.required`/`auth.failed` rejections clearly.

## Tasks

- [ ] Confirm `auth` is sent in `buildHelloPayload` (`connection.ts:150`) and broaden the `auth` option type (`types.ts:82`) to allow arbitrary scheme fields while keeping `token` for the common case.
- [ ] Verify that a welcome-error frame (`payload.status === "error"`) rejects `connect()` — the pending resolver already maps it to a `StarfishError` with `code = "auth.failed"`/`"auth.required"`. Add a test asserting the surfaced code.
- [ ] Test: connect with a valid token to an auth-required server succeeds; connect without a token throws `StarfishError` with `code === "auth.required"`.

## Acceptance Criteria

- A client can pass an auth token and connect to an auth-required server; a missing/invalid token throws with the correct `auth.*` code.
- `npm run check && npm run lint && npm run format:check && npm run test` pass in `sdks/typescript/`.
