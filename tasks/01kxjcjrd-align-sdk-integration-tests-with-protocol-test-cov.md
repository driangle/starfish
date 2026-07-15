---
title: "Align SDK integration tests with protocol test coverage"
id: "01kxjcjrd"
status: pending
priority: medium
type: chore
tags: ["testing", "sdk"]
created_at: "2026-07-15"
---

# Align SDK integration tests with protocol test coverage

## Objective

The SDK integration tests (TypeScript and Python) are missing several features that are covered in the protocol-level tests. Align SDK test coverage so both SDKs exercise the same protocol features.

## Tasks

- [ ] Add `set.add` / `set.remove` data operation tests to both SDKs
- [ ] Add `list.add` / `list.remove` data operation tests to both SDKs
- [ ] Add `delete` data operation tests to both SDKs
- [ ] Add `self`-scoped data tests (write self-scoped, verify other client can't read it)
- [ ] Add `topic.peers` subscription map tests to both SDKs
- [ ] Add `ping`/`pong` or heartbeat tests to both SDKs (if exposed in SDK API)
- [ ] Add RTC signaling tests (offer/answer/ice relay) to both SDKs (if SDK supports it)
- [ ] Add error handling tests (session.not_found, client.not_found) to both SDKs

## Acceptance Criteria

- Both TypeScript and Python SDK integration tests cover: set ops, list ops, delete, self-scope, topic.peers, and error paths
- SDK test coverage is comparable to the protocol-level test suite
- All new tests pass against both Go and TypeScript servers
