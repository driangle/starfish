---
title: "Write cookbook with practical recipes"
id: "01kx31gbr"
status: pending
priority: medium
type: feature
tags: ["docs"]
created_at: "2026-07-09"
---

# Write cookbook with practical recipes

## Objective

Write a cookbook of practical recipes for the Starfish TypeScript SDK. Each recipe solves a specific, real-world problem with minimal explanation, following the Problem → Solution → Code → Explanation → Variations format.

## Tasks

- [ ] Create `docs/cookbook/` directory (coordinate with user guide task for shared `docs/` structure)
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
- [ ] Review all recipes for accuracy against current SDK source code

## Acceptance Criteria

- A `docs/cookbook/` directory exists with at least 8 recipes
- Each recipe follows the Problem → Solution → Code format
- Code examples are valid TypeScript and use correct SDK types/APIs
- Recipes are self-contained — each can be understood independently
- No placeholder or TODO content remains
