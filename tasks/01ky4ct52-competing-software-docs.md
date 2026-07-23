---
title: "Add 'Competing Software' comparison section to internal docs"
id: "01ky4ct52"
status: completed
priority: medium
type: feature
phase: v0.1
tags: ["docs", "research", "positioning"]
created_at: "2026-07-22"
completed_at: 2026-07-23
---

# Add 'Competing Software' comparison section to internal docs

## Objective

Add a **Competing Software** section to the internal docs that surveys the frameworks,
protocols, libraries, and hosted services that overlap with Starfish. The goal is to give the
team a clear, honest map of the landscape: where each alternative shines, where it falls short
for creative-coding use cases, and how Starfish is positioned against it.

Each solution gets **its own page** describing what it is and how it compares to Starfish
(transport-neutral realtime protocol for creative coding — sessions, topics/pub-sub, presence,
shared CRDT-style state, WebRTC, pool matchmaking, and multi-language SDKs). Pages should be
factual and specific, not marketing copy — this is an internal positioning reference.

This section is internal-facing only; it should not be published to the public VitePress site.

## Tasks

- [x] Decide on a home for the section so it stays out of the public build (e.g. a
      `docs/internal/competing-software/` folder excluded from the VitePress config, or a
      `docs-internal/` tree). Confirm it is not wired into the public `nav`/`sidebar` in
      `docs/.vitepress/config.ts`.
      → Home: `docs/internal/competing-software/`, excluded via `srcExclude: ["internal/**"]`.
      Verified absent from nav/sidebar; build produces no `dist/internal/` output.
- [x] Write an `index.md` overview: a one-screen comparison matrix (rows = solutions, columns
      = key axes) plus how to read the per-solution pages.
- [x] Define the comparison axes used consistently across every page, e.g.:
      transport (WebSocket / WebRTC / both), self-hostable vs hosted-only, protocol vs library
      vs service, presence, pub/sub, shared/synced state model (CRDT / OT / last-write-wins),
      matchmaking, language/runtime coverage, licensing/cost, and creative-coding fit.
      → Defined once in `axes.md`, linked from index + every page.
- [x] Write one page per solution. Suggested initial set (add/remove as research dictates):
  - [x] **Colyseus** — authoritative multiplayer game server framework (rooms, state sync).
  - [x] **Nakama** — game backend with matchmaking, presence, and realtime.
  - [x] **PartyKit** — edge-hosted stateful realtime rooms (Durable Objects style).
  - [x] **Liveblocks** — hosted collaborative presence + storage (CRDT) service.
  - [x] **Yjs** / **Automerge** — CRDT libraries for shared state (the "shared data" overlap).
  - [x] **Trystero** — serverless WebRTC rooms, popular in creative coding.
  - [x] **Croquet / Multisynq** — deterministic synchronized multiplayer, creative-coding focus.
  - [x] **p5.party** — p5.js-native shared state for multiplayer sketches.
  - [x] **Socket.IO** — general-purpose WebSocket eventing library.
  - [x] **Ably** / **Pusher** — hosted pub/sub + presence channels.
  - [x] **Supabase Realtime** — Postgres-backed broadcast/presence channels.
  - [x] **Photon / Normcore** — Unity-oriented realtime multiplayer networking.
  - [x] **PeerJS / simple-peer** — thin WebRTC signaling/peer wrappers.
  - [x] **OSC (Open Sound Control)** — the incumbent protocol for performance/installation setups.
- [x] For each page follow a consistent template: *What it is* → *How it works* → *Overlap with
      Starfish* → *Where Starfish differs / wins* → *Where it beats Starfish* → *Verdict*.
- [x] Keep the honest-tradeoffs framing: note cases where an alternative is the better choice.
- [x] Add a short "How we position against this" note per page for team/sales/README use.

## Acceptance Criteria

- A **Competing Software** section exists in the internal docs with an `index.md` overview and
  a comparison matrix covering every documented solution.
- There is **one page per solution**, each describing the solution and comparing it to Starfish
  across the shared, consistently-applied axes.
- Each page states both where Starfish is stronger and where the alternative is stronger — no
  page is one-sided marketing.
- The section is **not** included in the public VitePress build (absent from `nav`/`sidebar` and
  excluded from the published output).
- The comparison axes are defined once and applied uniformly across all pages.
- Internal links between the overview matrix and each solution page resolve correctly.
