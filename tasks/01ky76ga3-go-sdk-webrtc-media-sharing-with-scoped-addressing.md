---
id: "01ky76ga3"
title: "Go SDK: WebRTC media sharing with scoped addressing"
status: pending
priority: medium
effort: large
phase: v0.4
dependencies: ["01ky7642z", "01ky76hzg"]
tags: ["sdk", "go", "media", "webrtc"]
created_at: 2026-07-23
---

# Go SDK: WebRTC media sharing with scoped addressing

## Objective

Implement an idiomatic media API in the Go SDK (`sdks/golang/`) on top of the RTC
data-plane (`01ky76hzg`), following `protocol/rfcs/0001-realtime-media.md`. Clients
`Share` local media (pion `TrackLocal`) scoped to the session, a subset of peers,
or a topic, and receive remote tracks tagged by peer/topic. Mesh topology only;
keep the declarative-scope seams so an SFU can be added later without app changes.

## Tasks

- [ ] Add `client.Media` API: `Share(track, scope)` → `Publication` (SetEnabled/ReplaceTrack/Stop),
      `Subscribe(topic)` / `Unsubscribe(topic)`.
- [ ] Implement scope resolution: session / audience `[]peerID` / topic
      (subscribers via the existing `topic/peers` map).
- [ ] Implement perfect-negotiation renegotiation over the `rtc` signaling frames.
- [ ] Implement the `media.map` track↔topic tag over the control channel; surface
      remote media via a channel `client.Media.Tracks()` yielding `RemoteStream{PeerID, Topic, Track}`.
- [ ] Provide a raw escape hatch to the underlying pion `PeerConnection`.
- [ ] Keep SFU seams honored (declarative scope; no peer-only hardcoding).
- [ ] Unit + integration tests (two Go peers exchange a track).
- [ ] Run the Go SDK build/vet/test suite green.

## Acceptance Criteria

- `Share` works for all three scopes; `Publication` supports enable/replace/stop.
- Track add/remove after connection renegotiates correctly (no glare deadlock).
- Remote media delivered on a channel as `RemoteStream{PeerID, Topic, Track}`.
- API is idiomatic Go and consistent with the media addressing model.
- Tests pass; `taskmd validate` passes.
