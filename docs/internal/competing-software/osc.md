# OSC (Open Sound Control)

> The incumbent messaging protocol for performance and installation setups.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

OSC is a lightweight **message protocol** for communicating between multimedia tools —
synthesizers, DAWs, lighting rigs, VJ software, and creative-coding environments. Born in the
computer-music world, it's the lingua franca that lets Max/MSP, Pure Data, TouchDesigner,
Ableton (via Max), SuperCollider, Processing, openFrameworks, and hardware controllers talk to
each other, typically over a LAN. If you've wired up a performance or installation, you've
almost certainly touched OSC.

## How it works

- Messages have an **address pattern** (`/synth/1/freq`) and typed **arguments** (floats, ints,
  strings, blobs); addresses form a hierarchical namespace you can pattern-match against.
- It's usually sent over **UDP** (low latency, fire-and-forget; may drop) though TCP is possible;
  **bundles** group messages with an optional timetag for scheduling.
- There's **no session, presence, or discovery** built in — you configure IP addresses and ports
  by hand (or layer OSCQuery for discovery). It's point-to-point / broadcast on a network you
  control.
- It is a **protocol/spec**, not a service — dozens of independent implementations exist in
  every creative environment and language.

## At a glance

| Axis | OSC |
|------|-----|
| Category | Protocol (message format) |
| Transport | UDP (usually) / TCP; LAN-oriented |
| Deployment | n/a — no server; peers send to known IP:port |
| Presence | No |
| Pub/Sub | Address-pattern routing (loosely pub/sub-like), no subscription model |
| Shared-state model | None — it's stateless messaging |
| Matchmaking | No |
| Language & runtime | Implemented ~everywhere: Max, PD, TouchDesigner, SC, Processing, Python, JS, hardware |
| Licensing / cost | Open spec — free |
| Creative-coding fit | Weak over the internet / browser; **strong** for LAN performance & installations |

## Overlap with Starfish

- Both are **protocols for creative/performance realtime** — this is the closest philosophical
  neighbor, and Starfish explicitly targets some of the same installations/performances.
- Both carry **typed messages** between creative tools.
- Starfish's **TouchDesigner adapter** puts it directly in OSC's traditional territory.

## Where Starfish differs / wins

- **Internet/browser-native, not LAN-bound.** OSC's UDP model is built for a trusted local
  network; getting it across the internet, through NAT, or into a browser is painful (browsers
  can't send raw UDP). Starfish runs over WebSocket/WebRTC and works browser-to-browser across
  the internet out of the box.
- **Sessions, presence, pub/sub subscriptions, shared state, matchmaking, reliability tiers.**
  OSC is stateless fire-and-forget with hand-configured endpoints; Starfish provides
  connection management, membership, and structured state.
- **Discovery and reliability.** No more hand-wiring IP:port and hoping UDP packets arrive;
  Starfish has real connections, reconnection, and reliable/unreliable/latest delivery.

## Where it beats Starfish

- **Ubiquity in the performance world.** OSC is *everywhere* — every serious audio/visual tool
  and controller speaks it. Interop with existing rigs is unmatched; Starfish is new and
  narrow by comparison.
- **Minimal latency on LAN.** Raw UDP on a local network is about as low-latency and simple as
  it gets for a live show — no handshake, no connection state.
- **Dead-simple and hardware-friendly.** Tiny to implement; runs on microcontrollers, DAWs,
  and lighting desks where a WebSocket/WebRTC stack would be overkill or impossible.

## Verdict

OSC wins for **local performance and installation setups** wiring together existing creative
tools and hardware on a trusted LAN — its ubiquity and simplicity are unbeatable there.
Starfish wins when the piece must reach **across the internet, into browsers, or between
distributed participants** with sessions, presence, shared state, and reliability that OSC
never attempts. They can coexist: bridge OSC on the local rig, Starfish for the networked/web
layer (e.g. via the TouchDesigner adapter).

## How we position against this

"OSC is the beloved incumbent for LAN performance rigs — every creative tool speaks it, and
it's perfect for low-latency local wiring. But it's stateless, UDP/LAN-bound, browser-hostile,
and has no sessions, presence, or reliability. Starfish is an internet- and browser-native
protocol with those built in, and it bridges into OSC's world via the TouchDesigner adapter.
Keep OSC for the local rig; reach for Starfish when the work goes online, cross-device, or into
the browser."
