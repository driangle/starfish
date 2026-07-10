---
id: "01kx5xcm4"
title: "TS Server: Topic pub/sub & messaging"
status: pending
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcm0"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: Topic pub/sub & messaging

## Objective

Implement topic subscription tracking, publish/subscribe message routing with type rewriting, direct client-to-client messaging, and session broadcast.

## Context

Port from Go server's `handler_topic.go` (subscribe/unsubscribe/publish + topic.peers) and `handler_messaging.go` (client.send + session.broadcast). Type rewriting means `topic.publish` is delivered as `topic.message` to subscribers.

## Tasks

- [ ] Implement topic subscription tracking per session (subscribe/unsubscribe)
- [ ] Implement `topic.subscribe` handler → `topic.subscribed` response
- [ ] Implement `topic.unsubscribe` handler → `topic.unsubscribed` response
- [ ] Implement `topic.publish` → `topic.message` routing with type rewrite
- [ ] Implement `topic.peers` subscription map push on every subscribe/unsubscribe
- [ ] Validate topic name length (max 128 chars)
- [ ] Implement `client.send` → `client.message` direct message routing
- [ ] Implement `session.broadcast` routing with `includeSelf` option support
- [ ] Write unit tests for topic routing and broadcast logic

## Acceptance Criteria

- Clients can subscribe/unsubscribe to topics within their session
- `topic.publish` is delivered as `topic.message` to all topic subscribers (except sender)
- `topic.peers` is sent to all subscribers whenever subscription set changes
- Topic names exceeding 128 chars are rejected with `topic.invalid`
- `client.send` delivers to the correct target client as `client.message`
- `session.broadcast` delivers to all session members, respecting `includeSelf`
- Non-subscribed clients cannot publish to a topic (rejected with `topic.not_subscribed`)
