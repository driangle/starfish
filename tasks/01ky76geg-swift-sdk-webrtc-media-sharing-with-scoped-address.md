---
id: "01ky76geg"
title: "Swift SDK: WebRTC media sharing with scoped addressing"
status: pending
priority: medium
effort: large
phase: v0.4
dependencies: ["01ky7642z", "01kxfzf96"]
tags: ["sdk", "swift", "media", "webrtc"]
created_at: 2026-07-23
---

# Swift SDK: WebRTC media sharing with scoped addressing

## Objective

Implement an idiomatic media API in the Swift SDK (`sdks/swift/`) on top of the
existing WebRTC support task (`01kxfzf96`), following
`protocol/rfcs/0001-realtime-media.md`. Clients `share` local media
(`RTCVideoTrack`/`RTCAudioTrack`) scoped to the session, a subset of peers, or a
topic, and receive remote streams tagged by peer/topic. Mesh topology only; keep
the declarative-scope seams so an SFU can be added later without app changes.

## Tasks

- [ ] Add `client.media` API: `share(track, scope:)` → `Publication`
      (setEnabled/replaceTrack/stop), `subscribe(topic:)` / `unsubscribe(topic:)`.
- [ ] Implement scope resolution: session / audience `[peerId]` / topic
      (subscribers via the existing `topic/peers` map).
- [ ] Implement perfect-negotiation renegotiation over the `rtc` signaling frames.
- [ ] Implement the `media.map` track↔topic tag over the control channel; surface
      remote media via a Combine publisher (`media.remoteStreams`) and/or delegate,
      as `RemoteStream(peerId, topic, stream)`.
- [ ] Provide a raw escape hatch to the underlying `RTCPeerConnection`.
- [ ] Keep SFU seams honored (declarative scope; no peer-only hardcoding).
- [ ] Unit + integration tests (two Swift peers exchange a track).
- [ ] Run the Swift SDK build/test suite green (incl. Linux where applicable).

## Acceptance Criteria

- `share` works for all three scopes; `Publication` supports enable/replace/stop.
- Track add/remove after connection renegotiates correctly (no glare deadlock).
- Remote media surfaced via Combine/delegate as `RemoteStream(peerId, topic, stream)`.
- API is idiomatic Swift and consistent with the media addressing model.
- Tests pass; `taskmd validate` passes.
