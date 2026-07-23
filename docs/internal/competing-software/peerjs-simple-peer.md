# PeerJS / simple-peer

> Thin WebRTC wrappers — signaling and peer-connection plumbing.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What they are

Both are **low-level WebRTC helper libraries** that take the pain out of the browser's raw
`RTCPeerConnection` API, but stop well short of being a realtime platform:

- **PeerJS** — wraps WebRTC in a simple peer-to-peer API and ships a small **signaling server**
  (PeerServer, self-hostable or a free cloud instance). Each peer gets an id; you `peer.connect(id)`
  to open a `DataConnection` or `call(id)` for media.
- **simple-peer** — an even thinner, transport-agnostic wrapper around a single peer connection.
  It does **not** provide signaling at all — you exchange the SDP offer/answer "signal" data
  yourself over whatever channel you like.

## How they work

- You establish a WebRTC connection between two (or, by managing many connections, several)
  peers: exchange signaling data, then get a direct **data channel** (and optional media).
- **PeerJS** handles discovery via its id-based signaling server; **simple-peer** leaves
  signaling entirely to you.
- After connection, it's **raw peer-to-peer** — no rooms, presence, pub/sub, or state; you
  build any structure on top of the data channel yourself.

## At a glance

| Axis | PeerJS / simple-peer |
|------|----------------------|
| Category | Library (WebRTC wrapper) |
| Transport | WebRTC (data + media) |
| Deployment | Self-host signaling (PeerJS server) / DIY signaling (simple-peer) |
| Presence | No |
| Pub/Sub | No |
| Shared-state model | None |
| Matchmaking | No |
| Language & runtime | JS/TS, browser (+ Node for simple-peer) |
| Licensing / cost | MIT — free |
| Creative-coding fit | Moderate — a common P2P building block, but very low-level |

## Overlap with Starfish

- **WebRTC data channels** — the direct technical overlap with Starfish's P2P transport.
- Both can move data **peer-to-peer** between browsers.

## Where Starfish differs / wins

- **A protocol vs. a connection primitive.** PeerJS/simple-peer give you a P2P pipe and
  nothing else — no rooms, presence, pub/sub, shared state, matchmaking, reliability tiers, or
  fallback. Starfish provides all of that; WebRTC is just one transport underneath.
- **Graceful transport fallback.** Starfish runs over WebSocket by default and uses WebRTC as
  an optional accelerator, so it works even when P2P can't connect (strict NAT, no TURN). Raw
  WebRTC wrappers simply fail there unless you add TURN and fallback logic yourself.
- **Multi-language and mesh management.** These wrappers are browser-JS and single-connection
  oriented; scaling to a room of N peers is your problem. Starfish handles group semantics.

## Where it beats Starfish

- **Minimal and unopinionated.** If you literally just need two browsers to open a direct data
  channel, these are tiny, focused, and add nothing else.
- **Full control of the WebRTC stack.** Direct access to the peer connection for custom media,
  codecs, or exotic topologies — useful when you're doing something WebRTC-specific.
- **No server semantics to adopt.** simple-peer in particular imposes nothing; you wire it into
  any signaling/transport you already have.

## Verdict

PeerJS/simple-peer win when you need a **thin, controllable WebRTC primitive** — two peers, a
data channel, maximum control, minimal opinion. Starfish wins when you need the **whole realtime
layer** — rooms, presence, pub/sub, shared state, matchmaking, and reliable WS↔WebRTC fallback —
rather than hand-building it on a raw peer connection.

## How we position against this

"PeerJS and simple-peer are handy thin wrappers over WebRTC — they get you a peer-to-peer data
channel and stop there; rooms, presence, state, and fallback are all yours to build. Starfish
treats WebRTC as one transport under a full protocol, with WebSocket fallback so it still works
when P2P can't connect. Use these wrappers when you want raw control of a peer connection; use
Starfish when you want a realtime application layer, not just a socket."
