---
id: "01ky7642z"
title: "Protocol: realtime media plane addressing and SFU-ready seams"
status: pending
priority: high
effort: medium
phase: v0.4
dependencies: []
tags: ["protocol", "media", "webrtc"]
created_at: 2026-07-23
---

# Protocol: realtime media plane addressing and SFU-ready seams

## Objective

Extend the Starfish protocol spec to define a **realtime media plane** for sharing
WebRTC MediaStreams, with the same addressing model as data (session / subset /
topic), and with the seams needed so an **SFU can be added later without breaking
app code or the frame envelope**. Spec revision only — additive, no protocol `v`
bump, no server changes required for the mesh phase.

Design reference: `protocol/rfcs/0001-realtime-media.md`. This is the protocol-first
foundation task; SDK and SFU tasks are split out only after this lands.

## Tasks

- [ ] Add a "Media Plane" section to `protocol/spec/starfish-v0.1.md` (§13–17 area):
      conceptual model (Publication, Subscription, RemoteStream, declarative Scope).
- [ ] Define media addressing mirroring data delivery: `session` (broadcast),
      `audience: [peerId]` (direct), `topic` (pub/sub). Use `share`/`unshare` naming
      to avoid colliding with topic `publish`.
- [ ] Specify that media reuses the existing `topic/peers` subscription map (§17)
      for topic-scoped fan-out; document the eventual-consistency / receiver-validation
      rules already in §17 as applying to media.
- [ ] Define the `media.map` control-channel message (track↔topic tag:
      `{ mid|streamId -> topic }`) so receivers can label inbound `ontrack`.
- [ ] Add optional `media` capability block to `server.welcome`
      (`modes: ["mesh"]` now, room for `"sfu"` + SFU endpoint descriptor later).
- [ ] SFU-forward-compat seams: endpoint-neutral signaling (target may be a peer
      OR a media-node/role); §24 carve-out to allow an SFU endpoint as a signaling
      target; reserve optional `simulcast` (on share) and `quality` (on subscribe) fields.
- [ ] Document the mesh vs SFU scaling boundary (no server-side media fan-out in mesh;
      K subscribers = K uploads) and that audience enforcement is client-side in mesh,
      server-side under an SFU.
- [ ] Confirm no frame-envelope change and no protocol version bump; note as a minor
      spec revision.

## Acceptance Criteria

- Spec describes media share/subscribe with all three scopes and the `share`/`unshare` API contract.
- Topic-scoped media is defined in terms of the existing `topic/peers` map — no new discovery subsystem.
- `media.map` tag and `welcome.media` capability are fully specified and marked additive.
- SFU seams are documented such that enabling SFU later requires no app-code change and no envelope change.
- Scaling boundary and security/authorization (mesh vs SFU enforcement) are documented.
- `taskmd validate` passes.
