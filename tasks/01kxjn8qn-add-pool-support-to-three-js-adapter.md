---
title: "Add pool support to Three.js adapter"
id: "01kxjn8qn"
status: pending
priority: medium
type: feature
tags: ["pool", "adapter", "threejs"]
created_at: "2026-07-15"
dependencies: ["01kxjn8mq"]
phase: v0.1.1
---

# Add pool support to Three.js adapter

## Objective

Expose pool matchmaking through `StarfishThree` so that Three.js experiences
can pair clients for multiplayer or interactive sessions. The adapter wraps
`StarfishClient` from `@driangle/starfish-client`
(`adapters/threejs/src/starfish-three.ts`) and adds scene-lifecycle-aware pool
management on top of it.

`auto` mode is the primary use case: a Three.js experience should be able to
enter a pool and react when a match arrives via a callback, without managing
member lists or mode details. The Three.js adapter already manages peer
lifecycle through `PeerManager` (`adapters/threejs/src/peer-manager.ts`), so
pool callbacks should integrate with that pattern — `onMatch` receives the
matched session name and peer IDs, giving the scene code enough information to
set up peer objects via the existing `peers` callbacks.

## Tasks

- [ ] Add `PoolOptions` and `PoolMatchCallback` types to `adapters/threejs/src/types.ts`:
  - `PoolOptions`: `{ groupSize?: number; mode?: "auto" | "claim" | "mutual" | "propose" | "delegated"; attributes?: Record<string, unknown>; filter?: Record<string, unknown>; }`
  - `PoolMatchCallback`: `(match: { pool: string; peers: string[]; session: string }) => void`
- [ ] Add `joinPool(pool: string, options: PoolOptions, onMatch: PoolMatchCallback): Promise<void>` to `StarfishThree`:
  - Calls `this.client.pool.enter(pool, { create: true, ...options })` (SDK pool API per spec section 23).
  - Subscribes to the SDK's pool matched event and invokes `onMatch` with the resulting session name and peer IDs.
  - Defaults `mode` to `"auto"` and `groupSize` to `2`.
  - Stores the subscription in `this.subscriptions` so it is torn down by `stop()` alongside other subscriptions.
- [ ] Add `leavePool(pool: string): Promise<void>` to `StarfishThree` that calls `this.client.pool.leave(pool)`.
- [ ] Export the new types from `adapters/threejs/src/index.ts`.
- [ ] Add unit tests in `adapters/threejs/src/__tests__/starfish-three.test.ts` covering:
  - `joinPool` calls `client.pool.enter` with the correct arguments including defaults.
  - `onMatch` callback fires with the correct `{ pool, peers, session }` shape when the SDK fires a match event.
  - `leavePool` calls `client.pool.leave`.
  - Pool subscriptions are cleaned up when `stop()` is called.

## Acceptance Criteria

- `starfishThree({ ... }).joinPool("lobby", {}, ({ session, peers }) => { ... })` works with zero boilerplate beyond the pool name and callback.
- `groupSize` defaults to `2` and `mode` defaults to `"auto"` when not specified.
- `leavePool` exits the named pool without disconnecting the client or disturbing existing peer state managed by `PeerManager`.
- Pool subscriptions are torn down inside the existing `stop()` cleanup path, requiring no separate disposal call.
- New types (`PoolOptions`, `PoolMatchCallback`) are exported from the adapter's public entry point (`adapters/threejs/src/index.ts`).
- All new code passes TypeScript compilation (`adapters/threejs/tsconfig.json`).
