---
id: "01ky7tfxn"
title: "p5.js adapter: remote media rendering helpers"
status: pending
priority: low
effort: small
phase: v0.4
dependencies: ["01ky76496"]
tags: ["adapter", "p5js", "media", "webrtc"]
created_at: 2026-07-23
---

# p5.js adapter: remote media rendering helpers

## Objective

Add thin, creative-coder-friendly helpers to the p5.js adapter (`adapters/p5js/`)
on top of the TypeScript SDK media API (`01ky76496`), so sketches can share their
camera/canvas and draw remote peers with minimal code. Follows
`protocol/rfcs/0001-realtime-media.md`.

## Tasks

- [ ] Add a helper to share local media (camera/mic or `canvas.captureStream()`),
      with the same scope options as the SDK (session / subset / topic).
- [ ] Add `remoteVideo(peerId)` / iteration over remote streams returning
      `p5.MediaElement` (or draw-ready) objects, tagged by peer/topic.
- [ ] Handle stream arrival/teardown so sketches can `image()` remote video onto the canvas.
- [ ] Update the p5.js adapter example project to demo a multi-peer video sketch.
- [ ] Lint/type/test green.

## Acceptance Criteria

- A sketch can share media and render remote peers' video with a few lines.
- Streams map cleanly to `p5.MediaElement` and clean up on peer leave.
- Example demonstrates the flow; consistent with the SDK media API.
- `taskmd validate` passes.
