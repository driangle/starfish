---
id: "01ky76g6h"
title: "Python SDK: WebRTC media sharing with scoped addressing"
status: pending
priority: medium
effort: large
phase: v0.4
dependencies: ["01ky7642z", "01ky76h53"]
tags: ["sdk", "python", "media", "webrtc"]
created_at: 2026-07-23
---

# Python SDK: WebRTC media sharing with scoped addressing

## Objective

Implement a Pythonic media API in the Python SDK (`sdks/python/`) on top of the
RTC data-plane (`01ky76h53`), following the media plane design in
`protocol/rfcs/0001-realtime-media.md`. Clients can `share` local media (aiortc
`MediaStreamTrack` / `MediaPlayer`) scoped to the session, a subset of peers, or a
topic, and receive remote tracks tagged by peer/topic. Mesh topology only; keep the
declarative-scope seams so an SFU can be added later without app-code changes.

## Tasks

- [ ] Add `client.media` API: `share(track, scope=…)`, `Publication` (enable/replace/stop),
      `subscribe(topic)` / `unsubscribe(topic)`.
- [ ] Implement scope resolution: session / `audience=[peer_id]` / `topic`
      (subscribers via the existing `topic/peers` map).
- [ ] Implement perfect-negotiation renegotiation over the `rtc` signaling frames.
- [ ] Implement the `media.map` track↔topic tag over the control channel; surface
      remote media via an async iterator `client.media.streams()` yielding
      `RemoteStream(peer_id, topic, track)`.
- [ ] Provide a raw escape hatch to the underlying aiortc `RTCPeerConnection`.
- [ ] Keep SFU seams honored (declarative scope; no peer-only hardcoding).
- [ ] Unit + integration tests (two Python peers exchange a track).
- [ ] Run the Python SDK lint/type/test suite green.

## Acceptance Criteria

- `share` works for all three scopes; `Publication` supports enable/replace/stop.
- Track add/remove after connection renegotiates correctly (no glare deadlock).
- Remote media surfaced as `RemoteStream(peer_id, topic, track)`.
- API is idiomatic Python and consistent with the media addressing model.
- Tests pass; `taskmd validate` passes.
