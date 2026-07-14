---
title: "Write cookbook with practical recipes"
id: "01kx31gbr"
status: completed
priority: medium
type: feature
tags: ["docs"]
created_at: "2026-07-09"
phase: v0.1
dependencies: [01kwyst27, 01kx1s2ca]
completed_at: 2026-07-14
---

# Write cookbook with practical recipes

## Objective

Write a cookbook of practical recipes for the Starfish TypeScript SDK as VitePress pages within the project's documentation site. Each recipe solves a specific, real-world problem with minimal explanation, following the Problem → Solution → Code → Explanation → Variations format.

## Tasks

- [x] Write recipe: **Connect with automatic reconnection** — configure `ReconnectOptions` for resilient connections
- [x] Write recipe: **Join a session and track who's online** — use `Presence` to monitor connected clients
- [x] Write recipe: **Publish/subscribe to a topic** — basic pub/sub messaging pattern
- [x] Write recipe: **Send reliable vs unreliable messages** — when to use each `DeliveryOptions.reliability` mode
- [x] Write recipe: **Store and sync shared state** — use `SaveOptions` with `DataOp` operations (replace, merge, counter, sets, lists)
- [x] Write recipe: **Request/reply pattern** — use `replyTo` for RPC-style communication
- [x] Write recipe: **Broadcast to specific clients** — targeted messaging with the `to` field
- [x] Write recipe: **Use WebRTC data channels for low-latency messaging** — configure `RTCOptions` and `preferTransport: "rtc"`
- [x] Write recipe: **Handle connection state changes** — react to `ConnectionState` transitions
- [x] Write recipe: **Filter events by type or topic** — use `EventFilter` for selective event handling
- [x] Update VitePress sidebar config to include all cookbook pages
- [x] Review all recipes for accuracy against current SDK source code

## Acceptance Criteria

- Cookbook pages exist under `docs/cookbook/` as VitePress-compatible markdown with at least 8 recipes
- Each recipe follows the Problem → Solution → Code format
- Code examples are valid TypeScript and use correct SDK types/APIs
- Recipes are self-contained — each can be understood independently
- Pages are linked in the VitePress sidebar navigation
- No placeholder or TODO content remains
