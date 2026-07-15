---
title: "Add resume and reconnection SDK integration tests"
id: "01kxjcjp6"
status: pending
priority: high
type: chore
tags: ["testing", "sdk"]
created_at: "2026-07-15"
---

# Add resume and reconnection SDK integration tests

## Objective

Resume/reconnection is tested at the protocol level but not in either SDK's integration tests. Since reconnection is critical for production reliability, both TypeScript and Python SDKs need integration tests covering the resume token flow.

## Tasks

- [ ] TypeScript SDK: test that disconnecting and reconnecting with a resume token preserves the clientId
- [ ] TypeScript SDK: test that session membership is restored after resume
- [ ] TypeScript SDK: test that an expired/invalid resume token results in a fresh session
- [ ] Python SDK: mirror the same 3 resume tests
- [ ] Verify tests pass against both Go and TypeScript servers

## Acceptance Criteria

- TypeScript SDK has at least 3 resume/reconnection integration tests
- Python SDK has at least 3 resume/reconnection integration tests
- Tests validate clientId preservation, session restoration, and graceful fallback on invalid tokens
