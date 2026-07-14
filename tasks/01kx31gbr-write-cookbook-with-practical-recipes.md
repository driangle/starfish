---
title: "Write cookbook with practical recipes"
id: "01kx31gbr"
status: pending
priority: medium
type: feature
tags: ["docs"]
created_at: "2026-07-09"
phase: v0.1
dependencies: [01kwyst27, 01kx1s2ca]
---

# Write cookbook with practical recipes

## Objective

Write a cookbook of practical recipes for the Starfish TypeScript SDK as VitePress pages within the project's documentation site. Each recipe solves a specific, real-world problem with minimal explanation, following the Problem → Solution → Code → Explanation → Variations format.

## Tasks

- [ ] Write recipe: **Connect with automatic reconnection** — configure `ReconnectOptions` for resilient connections
- [ ] Write recipe: **Join a session and track who's online** — use `Presence` to monitor connected clients
- [ ] Write recipe: **Publish/subscribe to a topic** — basic pub/sub messaging pattern
- [ ] Write recipe: **Send reliable vs unreliable messages** — when to use each `DeliveryOptions.reliability` mode
- [ ] Write recipe: **Store and sync shared state** — use `SaveOptions` with `DataOp` operations (replace, merge, counter, sets, lists)
- [ ] Write recipe: **Request/reply pattern** — use `replyTo` for RPC-style communication
- [ ] Write recipe: **Broadcast to specific clients** — targeted messaging with the `to` field
- [ ] Write recipe: **Use WebRTC data channels for low-latency messaging** — configure `RTCOptions` and `preferTransport: "rtc"`
- [ ] Write recipe: **Handle connection state changes** — react to `ConnectionState` transitions
- [ ] Write recipe: **Filter events by type or topic** — use `EventFilter` for selective event handling
- [ ] Update VitePress sidebar config to include all cookbook pages
- [ ] Review all recipes for accuracy against current SDK source code

## Acceptance Criteria

- Cookbook pages exist under `docs/cookbook/` as VitePress-compatible markdown with at least 8 recipes
- Each recipe follows the Problem → Solution → Code format
- Code examples are valid TypeScript and use correct SDK types/APIs
- Recipes are self-contained — each can be understood independently
- Pages are linked in the VitePress sidebar navigation
- No placeholder or TODO content remains
