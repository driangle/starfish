---
title: "Review and refine SDK API symmetry for send/receive patterns"
id: "01kxjjzqb"
status: completed
priority: medium
type: feature
tags: ["protocol", "sdk", "api-design"]
created_at: "2026-07-15"
phase: v0.1.1
completed_at: 2026-07-15
---

# Review and refine SDK API symmetry for send/receive patterns

## Objective

The SDK API has an asymmetry in its send/receive patterns for direct messaging. Sending uses specific methods (`send`, `sendRTC`) while receiving uses a generic event filter (`events$({ type: "client.message" })`). Topics and presence are symmetric (`publish`/`topic$`, `presence.set`/`presence$`), but direct messaging is not.

Two changes are proposed for critical review:

**1. Add a dedicated `messages$` observable for direct messages:**

```typescript
// Current (asymmetric)
client.send(peerId, data)
client.events$({ type: "client.message" }).subscribe(...)

// Proposed (symmetric)
client.send(peerId, data)
client.messages$.subscribe(...)
client.messagesFrom$(peerId).subscribe(...)
```

**2. Remove `sendRTC` — make transport a delivery option, not a method:**

```typescript
// Current (transport leaks into API)
client.sendRTC(peerId, "stream", data)

// Proposed (transport is a hint)
client.send(peerId, data, { delivery: { preferTransport: "rtc", reliability: "unreliable" } })
```

The developer should critically review these proposals before accepting or modifying them. Consider:
- Does removing `sendRTC` lose important ergonomics for the high-frequency streaming use case?
- Is `messages$` / `messagesFrom$` the right naming?
- Should the channel name ("stream", "control", "state") still be specifiable when hinting RTC?
- Are there use cases where the current asymmetry is actually preferable?

## Tasks

- [x] Review the current SDK API surface in `sdks/typescript/src/client.ts` and the protocol spec section 23
- [x] Evaluate the `messages$` / `messagesFrom$` proposal — ACCEPTED: adds symmetry with topics/presence/data patterns
- [x] Evaluate the `sendRTC` removal proposal — ACCEPTED: `send()` with delivery options already handles RTC routing
- [x] If changes are accepted, update the SDK API Reference in `protocol/spec/starfish-v0.1.md` section 23
- [x] If changes are accepted, update `sdks/typescript/src/client.ts` and related modules

## Acceptance Criteria

- The developer has reviewed both proposals and documented their reasoning for accepting, modifying, or rejecting each
- If accepted, the SDK API Reference in the protocol spec reflects the changes
- If accepted, send and receive patterns for direct messaging are symmetric
- No breaking changes to existing working functionality without clear migration path
