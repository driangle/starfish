---
title: "Add resume and reconnection SDK integration tests"
id: "01kxjcjp6"
status: completed
priority: high
type: chore
tags: ["testing", "sdk"]
created_at: "2026-07-15"
completed_at: 2026-07-20
---

# Add resume and reconnection SDK integration tests

## Objective

Resume/reconnection is tested at the protocol level but not in either SDK's integration tests. Since reconnection is critical for production reliability, both TypeScript and Python SDKs need integration tests covering the resume token flow.

## Tasks

- [x] TypeScript SDK: test that disconnecting and reconnecting with a resume token preserves the clientId
- [x] TypeScript SDK: test that session membership is restored after resume
- [x] TypeScript SDK: test that an expired/invalid resume token results in a fresh session
- [x] Python SDK: mirror the same 3 resume tests
- [x] Verify tests pass against both Go and TypeScript servers

> **Note:** The Python `disconnect()`+resume tests exposed a real Python SDK bug
> (resume fails after `disconnect()`). The two affected tests are marked
> `xfail(strict)` and the fix is tracked in task `01ky0jyep`. The TypeScript SDK
> resume tests all pass against both servers; the Python invalid-token test passes.

## Acceptance Criteria

- TypeScript SDK has at least 3 resume/reconnection integration tests
- Python SDK has at least 3 resume/reconnection integration tests
- Tests validate clientId preservation, session restoration, and graceful fallback on invalid tokens
