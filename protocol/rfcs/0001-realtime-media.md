# RFC 0001 — Realtime Media Plane (WebRTC MediaStreams)

- **Status:** Draft / proposal (no code changes yet)
- **Author:** design discussion
- **Affects:** protocol spec, TypeScript SDK first; other SDKs and an optional SFU later
- **Relationship to spec:** additive to `protocol/spec/starfish-v0.1.md` §13–17, §24. No breaking change; no envelope change. Targets a minor spec revision, not a protocol version bump.

---

## 1. Summary

Give Starfish clients a **friendly, language-native way to share and receive WebRTC media streams** (camera, mic, screen, `canvas.captureStream()`), with the same **addressing model as data** — session-wide, a specific subset of peers, or by topic — and design the seams so an **SFU can be dropped in later without changing app code**.

The core move: media is a **declarative capability** (“share this stream with this audience”), and the SDK realizes that declaration over whatever topology is active (peer-to-peer mesh now, SFU later). App developers never touch transceivers, renegotiation, or glare.

## 2. Motivation

Starfish today (v0.1) is JSON-first: WebSocket control plane + optional WebRTC **data channels** (§13–16). It carries control/coordination signals well, but has no concept of media tracks. Creative-coding use cases — networked performance, live visuals, installations — routinely want live video/audio/canvas between participants. Clients *can* smuggle tracks onto the `RTCPeerConnection` via the `factory` hook, but there is no public API, no renegotiation, and no targeting.

## 3. Goals / Non-goals

**Goals**
- First-class, idiomatic media API per SDK (TS first).
- Media addressing that mirrors data: **broadcast / direct / topic**.
- Hide all WebRTC plumbing (transceivers, renegotiation, glare, track↔topic mapping).
- **Keep the door open for SFU scaling** — topology-neutral API and protocol seams.
- No breaking protocol change; server stays media-agnostic in the mesh phase.

**Non-goals (for the initial phases)**
- Building an SFU. This RFC makes SFU *possible* later; it does not implement it.
- Media in non-browser SDKs (Python/Go/Swift/JVM) beyond leaving room for it. Those SDKs have **no RTC at all** today and need the full data-plane first plus a native WebRTC lib.
- Recording, transcoding, server-side mixing.

## 4. Design principles (alignment with spec §28)

- **One media API, pluggable topology.** Extends §28.1 (“one envelope, two transports”) to “one media API, two topologies (mesh now, SFU later).”
- **Clients declare intent; the transport realizes it.** Targeting is *declarative scope* (audience/topic), never imperative “open these connections.” This is what lets mesh and SFU share one API (§28.4).
- **Server provides mechanics, clients provide intelligence** (§28.5). In mesh, the server only relays signaling (as today). An SFU later is a *media-plane mechanic* the server offers; routing *policy* (who’s in the audience, which topic) stays client-declared.

## 5. Conceptual model

- A **Publication** is a local stream/track the client shares, with a **scope**.
- A **Subscription** is a client’s declared interest in receiving media (by topic).
- A **RemoteStream** is inbound media, tagged with `{ peerId, topic }`.
- **Scope** is declarative and one of:
  - `session` — everyone in the session (default)
  - `audience: [peerId…]` — a specific subset
  - `topic: name` — whoever is subscribed to that media topic

The SDK translates scope → concrete connections for the active topology.

## 6. Addressing — media mirrors data

| Data (today) | Media (proposed) | Reaches |
|---|---|---|
| `broadcast(payload)` | `media.share(stream)` | all peers in session |
| `send(to, payload)` | `media.share(stream, { to })` | specific peer / subset |
| `publish(topic, …)` + `subscribe(topic)` | `media.share(stream, { topic })` + `media.subscribe(topic)` | topic subscribers |

Naming note: use **`share` / `unshare`** for media to avoid colliding with topic `publish`.

## 7. Client API (language-native)

Canonical TypeScript (browser-native `MediaStream`, Promises, existing `Observable`):

```ts
// --- Share (any of the three scopes) ---
const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

const pub = await client.media.share(cam);                    // session (default)
const pub = await client.media.share(cam, { to: [a, b] });    // subset
const pub = await client.media.share(stageCam, { topic: "stage-cam" }); // topic

// --- Manage a publication ---
pub.setEnabled(false);            // mute
await pub.replaceTrack(screen);   // camera -> screenshare, no re-share
pub.stop();

// --- Receive ---
await client.media.subscribe("stage-cam");
client.media.on("stream", ({ peerId, topic, stream }) => mount(topic, stream));
client.media.on("streamended", ({ peerId, topic }) => unmount(peerId, topic));
client.media.remote$.subscribe(renderAllTiles);   // reactive, matches SDK style

// --- Escape hatch for power users ---
const pc = client.getPeerConnection(peerId);      // the real RTCPeerConnection
```

Other SDKs follow the same shape with native types (built only after each gains RTC):
- **Python (aiortc):** `await client.media.share(player.video)`, `async for r in client.media.streams(): ...` (`r.peer_id`, `r.topic`, `r.track`).
- **Swift (WebRTC.framework):** `try await client.media.share(track)`, `client.media.remoteStreams.sink { ... }` (or delegate).
- **Go (pion):** `client.Media.Share(track)`, `for r := range client.Media.Tracks() { ... }`.
- **JVM (webrtc-java):** `client.media.share(track)`, `client.media.remoteStreams.collect { ... }`.

## 8. Mechanics — mesh realization (phase 1)

Media is per-`RTCPeerConnection`, so **subset targeting is the underlying primitive**; session-broadcast is “add to every peer.”

- **Scope → connections:**
  - `session` → the peers already connected in the session.
  - `audience` → open/reuse a pc to each listed peer; add the track there only.
  - `topic` → resolve subscribers from the **existing** `topic/peers` map (§17) — the server already pushes the subscriber peer-ID list to publishers for RTC topic fanout. Reuse it verbatim.
- **Renegotiation:** adding/removing a track fires `onnegotiationneeded`; the SDK runs a **perfect-negotiation** loop (polite/impolite peer, rollback on glare) over the existing `rtc` offer/answer/ICE frames (§14). This is the one genuinely non-trivial engineering item and must be done properly + tested.
- **Track ↔ topic tag:** SDP m-lines carry no app-level topic name, so on `addTrack` the publisher sends a tiny mapping `{ mid|streamId → topic }` over the `starfish.control` data channel. The receiver uses it to tag the inbound `ontrack` as `RemoteStream { peerId, topic }`. This is the only media-specific protocol addition in the mesh phase.
- **Membership churn:** subscribe → publisher adds track + renegotiates; unsubscribe → removeTrack + renegotiate. §17’s eventual-consistency + receiver-side validation rules already cover the stale-map window.
- **Server:** unchanged. It already relays opaque SDP/ICE and already emits `topic/peers`. **No server changes in the mesh phase.**

## 9. SFU-forward-compatibility — the seams

The point of doing this now: these seams are cheap to include upfront and expensive to retrofit. None require an SFU to exist yet.

1. **Capability negotiation.** Server advertises a media capability in `server.welcome` (additive), e.g. `media: { modes: ["mesh"] }` today, `["mesh","sfu"]` later, plus an SFU endpoint descriptor when present. Client picks a mode from what’s offered + session policy. Mesh is always the floor.
2. **Declarative scope, not imperative connections.** Because `share` takes `{ session | to | topic }` (audience *intent*) rather than “connect to peers X,Y,” the same call means:
   - *mesh:* SDK opens pcs to the audience and enforces client-side.
   - *sfu:* SDK opens **one** upstream pc to the SFU and passes the audience/topic as routing metadata; the SFU enforces the ACL and fans out. **App code is identical.**
3. **Endpoint-neutral signaling.** The `rtc` offer/answer/ICE flow already works against any endpoint that speaks it — a peer *or* an SFU node. Keep the signaling target abstract (a peer id *or* a media-node id/role). Forward-compat note for spec §24: its “RTC signaling only between clients in the same session” rule needs a carve-out allowing an SFU endpoint as a target.
4. **Topic-first semantics = SFU-native.** An SFU is literally a pub/sub media router: publishers push one upstream, subscribers pull downstream. Because media addressing is already pub/sub-shaped (§6), the SFU path is a drop-in — only the SDK’s “who do I open a pc to” resolution changes.
5. **Quality/selection hooks (optional, reserved now).** Allow `share(stream, { simulcast: [...] })` and `subscribe(topic, { quality })` as optional fields that are no-ops in mesh but meaningful to an SFU (layer selection, pause/resume). Reserving the fields now avoids an API break later.

Net: switching a session from mesh to SFU is a **server capability + an SDK topology strategy**, with **zero change to application code** and no envelope change.

## 10. Scaling & the topology boundary

- **Mesh has no server-side media fan-out.** Sharing one stream to *K* subscribers = *K* encoded uploads from the publisher (simulcast mitigates, doesn’t remove). Data topics fan out cheaply server-side; **media topics do not.**
- Therefore **subset/targeted media is the well-suited primary case** (small groups) — which is exactly the motivating requirement. “Media topic with dozens of subscribers” is a mesh foot-gun and the trigger to enable SFU mode.
- **An SFU is a real media server** (ingest/egress, simulcast layer selection, bandwidth, TURN, horizontal scaling). “Keeping the door open” means the protocol/SDK don’t foreclose it — **not** building it in these phases.

## 11. Protocol additions (all additive)

- `server.welcome`: optional `media` capability block (modes, optional SFU endpoint).
- Control-channel message: `media.map` (track↔topic tag). Small, versioned with the media capability.
- Optional, reserved: `simulcast` on share, `quality` on subscribe; SFU-target carve-out in §24.
- No change to the frame envelope, no protocol `v` bump; ships as a minor spec revision documenting the media plane.

## 12. Security / authorization

- Media inherits session authorization: you can only signal to peers/SFU within your session (§24, extended for the SFU endpoint).
- `audience` and media-topic membership are **enforced client-side in mesh** (a publisher simply doesn’t add the track for non-audience peers) and **server-side by the SFU** later. Document that mesh audience enforcement is only as strong as the publishing client — an SFU strengthens it.

## 13. Delivery plan (protocol-first)

Following the project’s protocol-first scoping: land the foundation, then split per-project tasks.

1. **Foundation (protocol):** media addressing model, `welcome` media capability, `media.map` tag, and the SFU seams (declarative scope, endpoint-neutral signaling, reserved quality fields, §24 carve-out). Spec revision only.
2. **TS SDK (mesh):** `client.media` (share/subscribe/scope), perfect-negotiation renegotiation engine, `topic/peers` reuse, track↔topic tagging, raw `getPeerConnection` accessor. Ships real value in browsers.
3. *(after foundation lands, split out)* adapter helpers (p5 `remoteVideo(peerId)`, Three, TouchDesigner); per-SDK media (Python/Go) each gated on that SDK first getting RTC; **SFU** server role + SDK `topology: "sfu"` strategy.

## 14. Open questions

- Exact shape of the SFU endpoint descriptor in `welcome`.
- Whether `audience` and media-topic should be unifiable (audience = ad-hoc topic?).
- Simulcast defaults and whether to expose them in v1 or reserve only.
- Mesh peer-count soft cap + when the SDK should *warn* that SFU mode is advisable.
