---
title: "Add delivery options protocol integration tests"
id: "01kxjcjpp"
status: pending
priority: medium
type: chore
tags: ["testing", "protocol"]
created_at: "2026-07-15"
---

# Add delivery options protocol integration tests

## Objective

The protocol spec defines delivery options (`reliability`, `ordering`, `preferTransport`, `priority`, `ttl`, `requireAck`) but none are tested. Add protocol-level integration tests for the most impactful options.

## Tasks

- [ ] Add test: `requireAck: true` on `topic.publish` produces an `ack` response
- [ ] Add test: `preferTransport: "ws"` forces WebSocket delivery
- [ ] Add test: `ttl` expiry — message sent with short TTL to offline client is not delivered on reconnect
- [ ] Add test: `priority` field is accepted and doesn't cause errors
- [ ] Add test: server handles unknown/invalid option values gracefully
- [ ] Verify tests pass against both Go and TypeScript servers

## Acceptance Criteria

- At least 4 tests covering `requireAck`, `preferTransport`, `ttl`, and `priority`
- Both servers handle delivery options without errors
- Tests validate that options affect behavior where observable (ack responses, transport selection)
