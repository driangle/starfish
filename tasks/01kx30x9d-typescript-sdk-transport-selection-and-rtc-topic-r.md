---
id: "01kx30x9d"
title: "TypeScript SDK: Transport Selection and RTC Topic Routing"
status: completed
priority: high
effort: medium
parent: "01kwyst27"
dependencies: ["01kx30x5f"]
tags: ["sdk", "typescript", "webrtc"]
created_at: 2026-07-09
completed_at: 2026-07-09
phase: v0.1
---

# TypeScript SDK: Transport Selection and RTC Topic Routing

## Objective

Implement transport selection logic (`preferTransport`) and RTC topic routing with subscription map validation, as defined in protocol spec sections 15-16. This enables the SDK to intelligently route messages between WebSocket and RTC based on delivery options and message type.

## Tasks

- [x] Implement transport selection module (`transport.ts`) with routing logic:
  - `preferTransport: "ws"` — always WebSocket
  - `preferTransport: "rtc"` — RTC if available, fallback based on `fallback` flag
  - `preferTransport: "auto"` — smart routing per spec section 15.3 auto routing table
- [x] Wire transport selection into `messaging.ts` (send, broadcast) and `topics.ts` (publish)
- [x] Add `transport.unavailable` error when RTC is requested but unavailable with `fallback: false`
- [x] Handle `topic.peers` frame — track subscription maps per topic (which peers subscribe to what)
- [x] Implement RTC topic fanout — deliver topic messages via RTC DataChannels to peers in subscription map
- [x] Implement receiver-side validation — drop incoming RTC topic messages for unsubscribed topics
- [x] Add `delivery` options support to `send()` and `publish()` methods
- [x] Write unit tests for transport selection logic (all preferTransport modes)
- [x] Write unit tests for subscription map tracking and validation

## Acceptance Criteria

- `preferTransport: "ws"` always sends via WebSocket regardless of RTC availability
- `preferTransport: "rtc"` sends via RTC when connected, falls back to WS when `fallback: true`, errors when `fallback: false` and RTC unavailable
- `preferTransport: "auto"` routes per the spec's auto routing table (data/session/presence via WS, unreliable sends via RTC, etc.)
- `topic.peers` subscription maps are tracked and updated
- Topic messages are delivered via RTC to peers listed in the subscription map
- Incoming RTC topic messages are validated against local subscriptions — unauthorized messages are dropped silently
- Delivery options (reliability, ordering, preferTransport, fallback) are respected throughout the message path
