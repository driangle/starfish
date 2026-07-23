---
id: "01ky76496"
title: "TypeScript SDK: WebRTC media sharing (mesh) with scoped addressing"
status: pending
priority: high
effort: large
phase: v0.4
dependencies: ["01ky7642z"]
tags: ["sdk", "typescript", "media", "webrtc"]
created_at: 2026-07-23
---

# TypeScript SDK: WebRTC media sharing (mesh) with scoped addressing

## Objective

Implement a friendly, browser-native media API in the TypeScript SDK
(`sdks/typescript/`) on top of the existing RTC layer (`rtc.ts`,
`rtc-signaling.ts`, `rtc-peer-connection.ts`). Clients can `share` local
MediaStreams scoped to the whole session, a subset of peers, or a topic, and
receive remote streams tagged by peer/topic — without touching transceivers,
renegotiation, or glare. Mesh (peer-to-peer) topology only; SFU is a later task.

Design reference: `protocol/rfcs/0001-realtime-media.md`. Depends on the protocol
foundation (`01ky7642z`).

## Tasks

- [ ] Add a `client.media` namespace: `share(stream, scope?)`, `unshare`/`Publication`
      handle (`setEnabled`, `replaceTrack`, `stop`), `subscribe(topic)`/`unsubscribe(topic)`.
- [ ] Implement scope resolution: `session` (all connected peers), `audience: [peerId]`
      (subset), `topic` (subscribers via the existing `topic/peers` map).
- [ ] Build the **renegotiation engine**: wire `onnegotiationneeded`, implement
      perfect-negotiation (polite/impolite peer, rollback on glare) over the existing
      `rtc` offer/answer/ICE frames. Make `handleOffer`/`handleAnswer` renegotiation-safe.
- [ ] Implement the `media.map` track↔topic tag over the `starfish.control` channel;
      tag inbound `ontrack` as `RemoteStream { peerId, topic, stream }`.
- [ ] Expose remote media: `media.on("stream"|"streamended", …)` and reactive
      `media.remote$: Observable<RemoteStream[]>` (match existing emitter/Observable style).
- [ ] Add the raw escape hatch `client.getPeerConnection(peerId)` returning the real
      `RTCPeerConnection` (typed accordingly; keep the internal `RTCPeerConnectionLike`
      seam intact for tests).
- [ ] Widen the mock pc in `rtc.test-helpers.ts` to support tracks + renegotiation.
- [ ] Handle membership churn: subscribe → add track + renegotiate; unsubscribe/leave →
      removeTrack/close + renegotiate; clean up on peer disconnect.
- [ ] Keep SFU seams honored: scope stays declarative; do not hardcode peer-only signaling
      targets (leave room for a future `topology: "sfu"` strategy).
- [ ] Unit tests (renegotiation/glare, scope resolution, track↔topic tagging) and an
      integration test (two peers exchange a media track end-to-end).
- [ ] Run `npm run check`, `npm run lint`, `npm run format:check`, `npm run test` — all green.

## Acceptance Criteria

- `client.media.share` works for all three scopes; `Publication` supports mute/replace/stop.
- Adding/removing tracks after connection renegotiates correctly with no glare deadlock.
- Inbound tracks are surfaced as `RemoteStream { peerId, topic, stream }` via both events and `remote$`.
- `client.getPeerConnection(peerId)` returns the live pc without breaking the tested abstraction.
- Two-peer integration test exchanges media successfully.
- API is documented and consistent with the media addressing model in the spec.
- All four SDK verification commands exit 0.
