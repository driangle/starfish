---
id: "01ky7tg02"
title: "Three.js adapter: remote media as video textures"
status: pending
priority: low
effort: small
phase: v0.4
dependencies: ["01ky76496"]
tags: ["adapter", "threejs", "media", "webrtc"]
created_at: 2026-07-23
---

# Three.js adapter: remote media as video textures

## Objective

Add helpers to the Three.js adapter (`adapters/threejs/`) on top of the TypeScript
SDK media API (`01ky76496`) so remote peer media can be applied to scene materials
as video textures with minimal code. Follows
`protocol/rfcs/0001-realtime-media.md`.

## Tasks

- [ ] Add a helper to share local media (camera/mic or `canvas.captureStream()`)
      with the SDK scope options (session / subset / topic).
- [ ] Map remote streams to `THREE.VideoTexture` (via a backing `<video>` element),
      keyed by peer/topic, with lifecycle handling (dispose on peer leave).
- [ ] Provide a small convenience for attaching a peer's texture to a material.
- [ ] Update the Three.js adapter example project to demo peers' video on 3D objects.
- [ ] Lint/type/test green.

## Acceptance Criteria

- Remote peer media renders as a `VideoTexture` and disposes correctly on leave.
- A few lines suffice to put a peer's stream on a mesh.
- Example demonstrates the flow; consistent with the SDK media API.
- `taskmd validate` passes.
