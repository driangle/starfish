---
id: "01ky0fjtm"
title: "Document the authentication flow and configuration"
status: pending
priority: medium
dependencies: ["01kxh8eby"]
tags: ["auth", "security", "docs"]
created_at: 2026-07-20
---

# Document the authentication flow and configuration

## Objective

Document the authentication flow and configuration options introduced by
protocol spec `protocol/spec/starfish-v0.2.md` §3.4, once the servers and SDKs
implement it.

## Tasks

- [ ] Add `docs/guide/authentication.md`: the handshake flow, the `auth` envelope and `auth.required`/`auth.failed` rejections, configuring a server validator, using the built-in constant-time token validator, writing a custom (JWT/HMAC/DB) validator, passing a token from each client SDK, and the `wss`/TLS requirement.
- [ ] Update `docs/guide/configuration.md` with the new server validator option.
- [ ] Add the new page to the VitePress nav/sidebar (`docs/.vitepress`).

## Acceptance Criteria

- Docs describe the auth message types, fields, handshake sequence, server configuration, and per-SDK client usage.
- The docs site builds without broken links.

## Notes

Depends on the server/SDK implementation tasks landing first so examples match
the shipped APIs.

