---
id: "01ky76hzg"
title: "Go SDK: WebRTC data-plane (signaling, peer connections, data channels)"
status: pending
priority: medium
effort: large
phase: v0.4
dependencies: []
tags: ["sdk", "go", "webrtc", "rtc"]
created_at: 2026-07-23
---

# Go SDK: WebRTC data-plane (signaling, peer connections, data channels)

## Objective

Add WebRTC support to the Go SDK (`sdks/golang/`), which today is WebSocket-only.
Implement the RTC data-plane defined in `protocol/spec/starfish-v0.1.md` §13–17:
signaling over WebSocket (offer/answer/ICE), peer connection lifecycle, and the
three standard data channels (control, stream, state). Uses `pion/webrtc` as the
native implementation. Prerequisite for Go media sharing (`01ky76ga3`); mirror the
TypeScript RTC layer for API symmetry.

## Tasks

- [ ] Add `pion/webrtc` dependency and RTC config/options to the client.
- [ ] Advertise `rtc` capability in hello; consume server ICE config from welcome.
- [ ] Implement `rtc` signaling handlers (connect/offer/answer/ice/connected/disconnected).
- [ ] Implement peer connection lifecycle and control/stream/state data channels
      with the spec's channel configs and size limits.
- [ ] Implement transport selection (`preferTransport`) and RTC topic routing with
      subscription-map (`topic/peers`) validation.
- [ ] Expose peer state / connected-peers accessors consistent with the TS SDK
      (idiomatic Go: channels/callbacks).
- [ ] Unit + integration tests (Go SDK ↔ servers) for RTC connect and data-channel messaging.
- [ ] Run the Go SDK build/vet/test suite green.

## Acceptance Criteria

- Go peers can establish RTC connections via WebSocket signaling.
- control/stream/state data channels work with correct configuration and limits.
- Transport selection and RTC topic routing match the TS SDK behavior.
- API mirrors the TS SDK RTC surface (idiomatic Go).
- Tests pass; `taskmd validate` passes.
