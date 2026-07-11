---
id: "01kx30x5f"
title: "TypeScript SDK: WebRTC Signaling and Peer Connections"
status: completed
priority: high
effort: large
parent: "01kwyst27"
dependencies: []
tags: ["sdk", "typescript", "webrtc"]
created_at: 2026-07-09
completed_at: 2026-07-09
phase: v0.1
---

# TypeScript SDK: WebRTC Signaling and Peer Connections

## Objective

Implement WebRTC peer connection management and signaling for the TypeScript SDK. This adds the ability to establish direct peer-to-peer DataChannel connections between clients, coordinated via WebSocket signaling as defined in protocol spec sections 12-14.

## Tasks

- [x] Add RTC-related types to `types.ts` (RTCPeerOptions, PeerConnection state, channel config)
- [x] Implement `rtc.ts` — peer connection manager that tracks RTCPeerConnection instances per peer
- [x] Implement DataChannel creation with 3 standard channels per peer:
  - `starfish.control` (ordered: true) — reliable messages, acks, control cues
  - `starfish.stream` (ordered: false, maxRetransmits: 0) — ephemeral streams, pose, cursors
  - `starfish.state` (ordered: true) — peer state, diffs, CRDT payloads
- [x] Implement signaling flow via WebSocket:
  - `rtc.connect` — request peer connection with channel list
  - `rtc.offer` — create and send SDP offer
  - `rtc.answer` — receive offer, create and send SDP answer
  - `rtc.ice` — exchange ICE candidates
  - `rtc.connected` / `rtc.disconnected` — connection state events
- [x] Handle incoming signaling frames in client frame router
- [x] Add `rtcPeers$` observable tracking connected RTC peers and their state
- [x] Add `connectRTC(peerId, channels?)` and `disconnectRTC(peerId)` methods to StarfishClient
- [x] Implement RTC frame send/receive over DataChannels (same Starfish frame envelope)
- [x] Add RTC payload size validation using `MAX_RTC_CONTROL_SIZE` and `MAX_RTC_STREAM_SIZE`
- [x] Update `client.hello` handshake to advertise `capabilities: { rtc: true }` when RTC is enabled
- [x] Write unit tests for RTC signaling state machine and channel management
- [x] Update `StarfishClientOptions` to include optional RTC configuration

## Acceptance Criteria

- WebRTC peer connections can be established between two clients via WebSocket signaling
- SDP offer/answer exchange works correctly through the server relay
- ICE candidates are gathered and exchanged
- All 3 DataChannels (control, stream, state) are created with correct configuration
- Frames can be sent and received over DataChannels using the standard Starfish envelope
- RTC payload size limits are enforced per channel type
- Connection state is tracked and observable via `rtcPeers$`
- Graceful handling of connection failures (ICE failed, peer disconnected)
