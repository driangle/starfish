---
id: "01ky76j3g"
title: "JVM SDK: WebRTC data-plane (signaling, peer connections, data channels)"
status: pending
priority: low
effort: large
phase: v0.4
dependencies: ["01kxbrhex"]
tags: ["sdk", "jvm", "kotlin", "webrtc", "rtc"]
created_at: 2026-07-23
---

# JVM SDK: WebRTC data-plane (signaling, peer connections, data channels)

## Objective

Add WebRTC support to the JVM SDK, which is WebSocket-only (and depends on the JVM
SDK itself existing — `01kxbrhex`). Implement the RTC data-plane defined in
`protocol/spec/starfish-v0.1.md` §13–17: signaling over WebSocket (offer/answer/ICE),
peer connection lifecycle, and the three standard data channels (control, stream,
state). Uses a native WebRTC binding (e.g. `webrtc-java`/libwebrtc). Prerequisite
for JVM media sharing (`01ky76gmx`); mirror the TypeScript RTC layer for symmetry.

## Tasks

- [ ] Select and add a native WebRTC dependency (webrtc-java / libwebrtc binding).
- [ ] Add RTC config/options; advertise `rtc` in hello; consume ICE config from welcome.
- [ ] Implement `rtc` signaling handlers (connect/offer/answer/ice/connected/disconnected).
- [ ] Implement peer connection lifecycle and control/stream/state data channels
      with the spec's channel configs and size limits.
- [ ] Implement transport selection (`preferTransport`) and RTC topic routing with
      subscription-map (`topic/peers`) validation.
- [ ] Expose peer state consistent with the TS SDK (idiomatic: coroutines/Flow).
- [ ] Unit + integration tests for RTC connect and data-channel messaging.
- [ ] Run the JVM SDK build/test suite green.

## Acceptance Criteria

- JVM peers can establish RTC connections via WebSocket signaling.
- control/stream/state data channels work with correct configuration and limits.
- Transport selection and RTC topic routing match the TS SDK behavior.
- API mirrors the TS SDK RTC surface (idiomatic Kotlin/JVM).
- Tests pass; `taskmd validate` passes.
