---
id: "01kx5xcmj"
title: "TS Server: WebRTC relay, security & limits"
status: pending
priority: high
effort: medium
type: feature
tags: [server, typescript]
parent: "01kwyst4k"
dependencies: ["01kx5xcm4", "01kx5xcme"]
created_at: 2026-07-10
phase: v0.1
---

# TS Server: WebRTC relay, security & limits

## Objective

Implement WebRTC signaling relay, enforce all security rules from spec section 23, enforce payload size limits from spec section 24, and ensure all error codes are returned correctly.

## Context

Port from Go server's `handler_rtc.go` (signaling relay), `limits.go` (size enforcement), and security rules scattered across handlers. This is the final feature task — it hardens the server for production correctness.

## Tasks

- [ ] Implement `rtc.connect` handler (notify target peer)
- [ ] Implement `rtc.offer` / `rtc.answer` / `rtc.ice` relay (forward with `from` overwrite)
- [ ] Validate both RTC peers are in the same session
- [ ] Implement `topic.peers` distribution for RTC peer discovery
- [ ] Enforce payload size limits on all handlers (WS 64KB, presence 8KB, data 256KB, topic name 128 chars, client meta 16KB)
- [ ] Enforce session membership on all session-scoped handlers
- [ ] Enforce `from` overwrite on ALL outbound frames (audit all send paths)
- [ ] Reject unsupported protocol versions with `protocol.unsupported_version`
- [ ] Return correct error codes for all error conditions (all 19 codes)
- [ ] Write unit tests for RTC relay routing
- [ ] Write integration-style tests for security rule enforcement

## Acceptance Criteria

- `rtc.offer/answer/ice` are relayed to the target peer with `from` set to sender
- RTC signaling between clients in different sessions is rejected
- All payload size limits are enforced with `payload.too_large`
- All security rules from spec section 23 are enforced
- All 19 error codes from spec section 18 are returned in appropriate situations
- `topic.peers` is distributed correctly for RTC peer discovery
