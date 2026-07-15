---
title: "Add error code coverage integration tests"
id: "01kxjcjqg"
status: pending
priority: medium
type: chore
tags: ["testing", "protocol"]
created_at: "2026-07-15"
---

# Add error code coverage integration tests

## Objective

The protocol defines 16 error codes but only 4 are tested (`protocol.unsupported_version`, `protocol.invalid_frame`, `session.not_found`, `client.not_found`). Add coverage for the remaining error paths to ensure both servers handle them correctly.

## Tasks

- [ ] Add test: `auth.required` — send a session-scoped message when auth is configured but not provided
- [ ] Add test: `auth.failed` — provide invalid credentials
- [ ] Add test: `session.full` — exceed configured session capacity
- [ ] Add test: `topic.not_subscribed` — unsubscribe from a topic the client isn't subscribed to
- [ ] Add test: `rate_limited` — exceed message rate limit
- [ ] Add test: `payload.too_large` — send a message exceeding the max payload size
- [ ] Add test: `resume.expired` — attempt resume with an expired token (after timeout window)
- [ ] Add test: `data.invalid_op` — use an invalid operation in data.save
- [ ] Add test: `data.forbidden` — write to another client's self-scoped data
- [ ] Verify all error tests pass against both Go and TypeScript servers

## Acceptance Criteria

- At least 8 additional error codes have integration test coverage
- Each test verifies the correct error code is returned
- Tests pass against both server implementations
