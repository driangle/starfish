---
title: "Add pool support to p5.js adapter"
id: "01kxjn8q4"
status: pending
priority: medium
type: feature
tags: ["pool", "adapter", "p5js"]
created_at: "2026-07-15"
dependencies: ["01kxjn8mq"]
phase: v0.1.1
---

# Add pool support to p5.js adapter

## Objective

Expose pool matchmaking through `StarfishP5` so that p5.js sketches can pair
with other clients without leaving a session. The adapter wraps `StarfishClient`
from `@driangle/starfish-client` (`adapters/p5js/src/starfish-p5.ts`) and
provides a simplified, sketch-friendly API on top of it.

`auto` mode is the primary use case for creative coding: artists should be able
to call a single method and receive a callback when a match is found, without
thinking about modes, member lists, or manual lifecycle management. Advanced
modes (`claim`, `mutual`, `propose`, `delegated`) are accessible but not
highlighted.

## Tasks

- [ ] Add `PoolOptions` and `PoolMatchCallback` types to `adapters/p5js/src/types.ts`:
  - `PoolOptions`: `{ groupSize?: number; mode?: "auto" | "claim" | "mutual" | "propose" | "delegated"; attributes?: Record<string, unknown>; filter?: Record<string, unknown>; }`
  - `PoolMatchCallback`: `(match: { pool: string; peers: string[]; session: string }) => void`
- [ ] Add `joinPool(pool: string, options: PoolOptions, onMatch: PoolMatchCallback): Promise<void>` to `StarfishP5`:
  - Calls `this.client.pool.enter(pool, { create: true, ...options })` (SDK pool API per spec section 23).
  - Subscribes to the SDK's pool matched event and invokes `onMatch` with the resulting session name and peer IDs.
  - Defaults `mode` to `"auto"` and `groupSize` to `2` so the common case is `sf.joinPool("lobby", {}, onMatch)`.
  - Stores the subscription in `this.subscriptions` so it is cleaned up on `stop()`.
- [ ] Add `leavePool(pool: string): Promise<void>` to `StarfishP5` that calls `this.client.pool.leave(pool)`.
- [ ] Export the new types from `adapters/p5js/src/index.ts`.
- [ ] Add unit tests in `adapters/p5js/src/__tests__/starfish-p5.test.ts` covering:
  - `joinPool` calls `client.pool.enter` with the correct arguments.
  - `onMatch` callback is invoked when the SDK fires a match event.
  - `leavePool` calls `client.pool.leave`.
  - Pool subscriptions are removed when `stop()` is called.

## Acceptance Criteria

- `starfishP5({ ... }).joinPool("lobby", {}, ({ session, peers }) => { ... })` works in a sketch with zero boilerplate beyond the pool name and callback.
- `groupSize` defaults to `2` and `mode` defaults to `"auto"` when not specified.
- `leavePool` exits the named pool without disconnecting the client.
- Pool event subscriptions are cleaned up when `stop()` is called (no memory leaks across sketch restarts).
- New types (`PoolOptions`, `PoolMatchCallback`) are exported from the adapter's public entry point (`adapters/p5js/src/index.ts`).
- All new code passes existing TypeScript compilation (`tsconfig.json` in `adapters/p5js/`).
