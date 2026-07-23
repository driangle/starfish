---
id: "01ky7tg2x"
title: "TouchDesigner adapter: media streams as TOPs"
status: pending
priority: low
effort: medium
phase: v0.4
dependencies: ["01ky76g6h"]
tags: ["adapter", "touchdesigner", "media", "webrtc"]
created_at: 2026-07-23
---

# TouchDesigner adapter: media streams as TOPs

## Objective

Extend the TouchDesigner adapter (`adapters/touchdesigner/`, the starfishClient TOX)
so shared media surfaces as TOPs and local TOPs/cameras can be shared to peers.
Builds on the Python SDK media API (`01ky76g6h`) since TouchDesigner is
Python-scripted. TouchDesigner is itself a media tool, so this is a high-value
integration. Follows `protocol/rfcs/0001-realtime-media.md`.

## Tasks

- [ ] Expose sharing a local video source (camera/TOP-derived stream) with the SDK
      scope options (session / subset / topic).
- [ ] Surface remote peer media as TOPs (one per peer/topic), with creation/teardown
      wired to peer presence.
- [ ] Provide TOX parameters/operators for selecting topic and audience.
- [ ] Confirm the Python-side WebRTC path (aiortc) works within the TD runtime; note
      any packaging constraints.
- [ ] Update the TouchDesigner adapter example project to demo peer video as TOPs.

## Acceptance Criteria

- A TD project can share a local source and receive peers' media as TOPs.
- Remote TOPs are created/destroyed with peer join/leave.
- Topic/audience selection is exposed via the TOX.
- Example demonstrates the flow; consistent with the SDK media API.
- `taskmd validate` passes.
