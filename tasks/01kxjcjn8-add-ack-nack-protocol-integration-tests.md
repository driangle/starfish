---
title: "Add ack/nack protocol integration tests"
id: "01kxjcjn8"
status: pending
priority: high
type: chore
tags: ["testing", "protocol"]
created_at: "2026-07-15"
---

# Add ack/nack protocol integration tests

## Objective

The `ack` and `nack` acknowledgement message types are defined in the v0.1 protocol spec but have zero integration test coverage. Add tests to validate acknowledgement delivery and error semantics.

## Tasks

- [ ] Add test: sending a message with `requireAck: true` results in an `ack` from the server or recipient
- [ ] Add test: `nack` is returned when delivery fails (e.g., target not found, topic not subscribed)
- [ ] Add test: `ack` contains correct `replyTo` referencing the original message ID
- [ ] Add test: messages without `requireAck` do not produce ack/nack responses
- [ ] Verify tests pass against both Go and TypeScript servers

## Acceptance Criteria

- At least 4 test cases covering ack success, nack on failure, replyTo correctness, and opt-out behavior
- Tests pass against both server implementations
