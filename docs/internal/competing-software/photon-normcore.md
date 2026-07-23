# Photon / Normcore

> Unity-oriented realtime multiplayer networking (game-engine-first).
> See the [overview](./index.md) and shared [axes](./axes.md).

## What they are

Both are commercial **realtime multiplayer networking solutions aimed primarily at game
engines (Unity first)**:

- **Photon** (Exit Games) — a family of products: **PUN** (Photon Unity Networking), **Fusion**
  (high-performance state sync with tick-based simulation), **Quantum** (deterministic ECS for
  competitive games), and **Photon Realtime/Voice/Chat**. Hosted cloud relay with global
  regions, plus matchmaking, rooms, and voice.
- **Normcore** (Normal VR) — a Unity-focused realtime networking service with an elegant
  **RealtimeModel** data-sync system, ownership, and built-in voice; hosted-only, subscription
  priced. Popular for social VR.

## How they work

- Clients (Unity `GameObject`s / components) connect to the vendor's **hosted relay/servers**
  and join **rooms**.
- Shared state is synchronized via engine-integrated models: Photon Fusion/Quantum use
  tick-based, often **authoritative or deterministic** simulation; Normcore syncs
  `RealtimeModel` fields with an **ownership** system.
- **Matchmaking, rooms, presence, and voice** are provided as part of the platform.
- Both are **hosted-only** (you buy CCU/usage plans); the networking is deeply tied to the game
  engine's object/component model.

## At a glance

| Axis | Photon / Normcore |
|------|-------------------|
| Category | Hosted service + engine SDK |
| Transport | UDP (Photon) / WebSocket where needed; engine-native |
| Deployment | Hosted-only (vendor cloud/relay) |
| Presence | Yes — room membership + player state |
| Pub/Sub | Via events/RPCs and synced models |
| Shared-state model | Server-authoritative / deterministic (Photon) or ownership-based sync (Normcore) |
| Matchmaking | Yes (Photon, rich); rooms (Normcore) |
| Language & runtime | Unity/C# first (Photon also Unreal, native, JS); **not** browser/creative-JS focused |
| Licensing / cost | Proprietary; CCU/subscription pricing |
| Creative-coding fit | Weak for browser/creative coding — Unity/game engine oriented |

## Overlap with Starfish

- **Rooms/sessions, presence, and matchmaking** exist in both.
- Both synchronize **shared state** across participants in realtime.

## Where Starfish differs / wins

- **Audience and runtime.** Photon/Normcore are **Unity/game-engine** tools; Starfish is
  **browser- and creative-coding-first** (p5.js, Three.js, TouchDesigner, web SDKs). For a web
  sketch, installation, or live-visual piece, the engine tools are a poor fit.
- **Self-hostable and open.** Both competitors are hosted-only with CCU pricing; Starfish you
  run yourself, no per-player billing.
- **Transport neutrality including browser WebRTC**; the engine tools center on native UDP
  relays.
- **Lightweight, no engine required.** Starfish doesn't assume Unity's object model or a game
  loop.

## Where it beats Starfish

- **Game-grade netcode.** Tick-based simulation, client-side prediction, lag compensation,
  deterministic ECS (Quantum), and authoritative anti-cheat — everything a serious real-time
  game needs and Starfish deliberately doesn't provide.
- **Deep engine integration** — sync `Transform`s/components with almost no code inside Unity.
- **Built-in low-latency voice** and mature, global relay infrastructure at game scale.

## Verdict

Photon/Normcore win decisively for **Unity/engine games and social VR** — authoritative or
deterministic netcode, prediction, voice, and turnkey relay at scale. Starfish wins for
**browser/creative-coding realtime** — sketches, installations, live visuals, web multiplayer
— where you want a self-hosted, transport-neutral protocol and are not living inside a game
engine.

## How we position against this

"Photon and Normcore are Unity-first multiplayer networking with game-grade netcode, voice,
and hosted relays — the right call for engine-based games and social VR. Starfish is for the
web/creative-coding world: browser and creative SDKs, self-hosted, transport-neutral with
WebRTC, no engine or CCU billing required. They barely compete — different runtimes, different
audiences. If it's a Unity game, use Photon/Normcore; if it's a browser or installation piece,
use Starfish."
