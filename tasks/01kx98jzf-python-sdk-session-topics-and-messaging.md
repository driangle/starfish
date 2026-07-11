---
id: "01kx98jzf"
title: "Python SDK: Session, Topics, and Messaging"
status: pending
priority: high
effort: medium
parent: "01kwyst2r"
phase: v0.1
dependencies: ["01kx98jye"]
tags: ["sdk", "python"]
created_at: 2026-07-11
---

# Python SDK: Session, Topics, and Messaging

## Objective

Implement session management, topic pub/sub, direct messaging, and broadcast on top of the Python SDK core infrastructure. Reference the TypeScript SDK (`sdks/typescript/src/session.ts`, `topics.ts`, `messaging.ts`) for API patterns.

## Tasks

- [ ] Implement `session.py` — `join`/`leave`, client list tracking from `session.joined` + `client.connected`/`client.disconnected` events
- [ ] Implement `topics.py` — `subscribe`/`unsubscribe`/`publish`, async iterator for topic messages
- [ ] Implement `messaging.py` — `send()` for direct messages, `broadcast()` with `include_self` option
- [ ] Wire session, topics, and messaging into `StarfishClient` facade
- [ ] Write integration tests for session lifecycle (join, leave, client tracking)
- [ ] Write integration tests for topic pub/sub and messaging

## Acceptance Criteria

- Client can join and leave sessions, receiving `session.joined`/`session.left` confirmations
- Client list tracking reflects current session membership
- Topic subscribe/unsubscribe works with server confirmations
- `publish()` sends `topic.publish` frames, subscribers receive `topic.message`
- `send()` delivers direct messages to specific clients
- `broadcast()` sends to all session clients, respects `include_self` option
- Integration tests pass against the Go server
