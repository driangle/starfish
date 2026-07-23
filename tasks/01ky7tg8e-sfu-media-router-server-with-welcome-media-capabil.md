---
id: "01ky7tg8e"
title: "SFU media router (server) with welcome media-capability advertising"
status: pending
priority: low
effort: large
phase: v0.5
dependencies: ["01ky7642z"]
tags: ["server", "sfu", "media", "webrtc", "scaling"]
created_at: 2026-07-23
---

# SFU media router (server) with welcome media-capability advertising

## Objective

Add an optional **SFU (Selective Forwarding Unit)** media router so large-audience
media no longer requires a full P2P mesh (where K subscribers = K uploads from the
publisher). Publishers push one upstream to the SFU; subscribers pull downstream;
the SFU enforces audience/topic routing. Implements the SFU side of the seams
designed in `protocol/rfcs/0001-realtime-media.md` §9. Depends on the protocol
foundation (`01ky7642z`); the media envelope, addressing, and signaling are already
defined there — no envelope change.

## Tasks

- [ ] Advertise the media capability in `server.welcome`: `media.modes` including
      `"sfu"` plus the SFU endpoint descriptor when enabled (add to TS/Python/Go servers).
- [ ] Implement the SFU endpoint that speaks the existing `rtc` signaling
      (offer/answer/ICE) as a media node — reusing the endpoint-neutral signaling seam.
- [ ] Implement selective forwarding keyed by media topic / audience ACL, driven by
      the declarative scope metadata (not peer-to-peer hardcoding).
- [ ] Enforce audience/topic membership server-side (stronger than mesh's client-side enforcement).
- [ ] Optional: honor simulcast layers / subscriber quality requests (the reserved fields).
- [ ] Tests: publisher→SFU→multiple subscribers forwarding; ACL enforcement; capability negotiation.

## Acceptance Criteria

- A session can be served in SFU mode with one upstream per publisher and per-subscriber downstream.
- Audience/topic routing is enforced by the SFU.
- Capability negotiation lets clients discover and select SFU mode; mesh remains the fallback.
- No frame-envelope change; app code is unchanged vs. mesh (topology is transparent).
- Tests pass; `taskmd validate` passes.
