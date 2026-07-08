---
id: "01kx1scwg"
title: "TypeScript SDK: Session, Topics, and Messaging"
status: completed
priority: high
effort: medium
parent: "01kwyst27"
dependencies: ["01kx1scvj"]
tags: ["sdk", "typescript"]
created_at: 2026-07-08
completed_at: 2026-07-08
---

# TypeScript SDK: Session, Topics, and Messaging

## Objective

Implement session management, topic pub/sub, direct messaging, and broadcast on top of the SDK core infrastructure.

## Tasks

- [x] Implement `session.ts` — join/leave, client list tracking from session.joined + client.connected/disconnected events
- [x] Implement clients$ and peers$ observables on StarfishClient
- [x] Implement `topics.ts` — subscribe/unsubscribe/publish, topic$() returning EventStream
- [x] Implement `messaging.ts` — send() for direct messages, broadcast() with includeSelf option
- [x] Wire session, topics, and messaging into StarfishClient facade
- [x] Write unit tests for session state management and topic subscription tracking

## Acceptance Criteria

- Client can join and leave sessions, receiving session.joined/session.left confirmations
- clients$ and peers$ observables reflect current session membership
- Topic subscribe/unsubscribe works with server confirmations
- topic$() returns filtered stream of messages for a specific topic
- publish() sends topic.publish frames, subscribers receive topic.message
- send() delivers direct messages to specific clients
- broadcast() sends to all session clients, respects includeSelf option
