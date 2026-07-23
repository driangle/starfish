---
id: "01ky7tgc2"
title: "SDK topology: SFU strategy for media (TypeScript first)"
status: pending
priority: low
effort: medium
phase: v0.5
dependencies: ["01ky7tg8e", "01ky76496"]
tags: ["sdk", "typescript", "sfu", "media", "webrtc"]
created_at: 2026-07-23
---

# SDK topology: SFU strategy for media (TypeScript first)

## Objective

Add an SFU topology strategy to the SDK media layer so that, when the server
advertises SFU mode, `client.media.share`/`subscribe` route through the SFU instead
of opening a P2P mesh — **with zero change to application code**. Implements the
client side of the seams in `protocol/rfcs/0001-realtime-media.md` §9. TypeScript
first (`01ky76496`); other SDKs follow once they have media. Depends on the SFU
router (`01ky7tg8e`).

## Tasks

- [ ] Read the `media` capability from `welcome`; select mesh vs SFU per session policy
      (mesh remains the fallback when SFU is unavailable).
- [ ] SFU path: open a single upstream `RTCPeerConnection` to the SFU endpoint for
      publishing; open downstream connection(s) for subscriptions; pass audience/topic
      as routing metadata rather than opening per-peer connections.
- [ ] Keep the public media API (`share`/`subscribe`/scope, `remote$`) byte-for-byte
      identical across mesh and SFU — verify no app-facing change.
- [ ] Optional: expose reserved `simulcast` (share) and `quality` (subscribe) hooks to the SFU.
- [ ] Tests: same app code passes against a mesh session and an SFU session; fallback path.

## Acceptance Criteria

- With an SFU-capable server, media flows through the SFU using one upstream per publisher.
- The same application code works unchanged in mesh and SFU sessions.
- Falls back to mesh when SFU is not advertised.
- Tests pass; `taskmd validate` passes.
