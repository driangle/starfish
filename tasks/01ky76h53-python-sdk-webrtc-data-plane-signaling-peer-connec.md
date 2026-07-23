---
id: "01ky76h53"
title: "Python SDK: WebRTC data-plane (signaling, peer connections, data channels)"
status: pending
priority: medium
effort: large
phase: v0.4
dependencies: []
tags: ["sdk", "python", "webrtc", "rtc"]
created_at: 2026-07-23
---

# Python SDK: WebRTC data-plane (signaling, peer connections, data channels)

## Objective

Add WebRTC support to the Python SDK (`sdks/python/`), which today is
WebSocket-only. Implement the RTC data-plane defined in
`protocol/spec/starfish-v0.1.md` §13–17: signaling over WebSocket (offer/answer/ICE),
peer connection lifecycle, and the three standard data channels (control, stream,
state). Uses `aiortc` as the native WebRTC implementation. This is the prerequisite
for Python media sharing (`01ky76g6h`); mirror the TypeScript RTC layer
(`sdks/typescript/src/rtc*.ts`) for API symmetry.

## Tasks

- [ ] Add `aiortc` dependency and RTC config/options to the client.
- [ ] Advertise `rtc` capability in the hello handshake; consume server ICE config from welcome.
- [ ] Implement `rtc` signaling handlers (connect/offer/answer/ice/connected/disconnected).
- [ ] Implement peer connection lifecycle and the control/stream/state data channels
      with the spec's channel configs and size limits.
- [ ] Implement transport selection (`preferTransport`) and RTC topic routing with
      subscription-map (`topic/peers`) validation, matching the TS SDK.
- [ ] Expose peer state / connected-peers observ­ables consistent with the TS SDK.
- [ ] Unit + integration tests (Python SDK ↔ servers) for RTC connect and data-channel messaging.
- [ ] Run the Python SDK lint/type/test suite green.

## Acceptance Criteria

- Python peers can establish RTC connections via WebSocket signaling.
- control/stream/state data channels work with correct configuration and limits.
- Transport selection and RTC topic routing match the TS SDK behavior.
- API mirrors the TS SDK RTC surface for symmetry.
- Tests pass; `taskmd validate` passes.
