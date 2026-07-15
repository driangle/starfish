---
title: "Add pool matchmaking recipes to cookbook"
id: "01kxkvkkg"
status: pending
priority: medium
type: feature
tags: ["pool", "docs", "cookbook"]
dependencies: ["01kxjn8mq"]
created_at: "2026-07-15"
---

# Add pool matchmaking recipes to cookbook

## Objective

Add four self-contained pool matchmaking recipes to `docs/cookbook/`. Each recipe follows the existing cookbook format: Problem / Solution / Code / Explanation / Variations. The recipes cover the most common pool patterns developers will reach for first.

## Background

Existing cookbook recipes (`presence.md`, `request-reply.md`, `shared-state.md`, etc.) each solve one specific problem. Pool recipes should follow the same structure. The TS SDK exposes pool via `client.pool` (a `Pool` instance with `enter`, `leave`, `claim`, `accept`, `reject`, `assign`, `members$`, `matched$`, `proposal$`, `claimRejected$`). The Python SDK exposes pool methods directly on `StarfishClient` as `pool_enter`, `pool_leave`, etc., with `pool_matched` as a property.

## Tasks

- [ ] Create `docs/cookbook/pool-auto-pairing.md` — **Random pairing with auto mode**
  - Problem: pair two strangers automatically without any client-side negotiation
  - Solution: enter a pool with `mode: "auto"`, listen for `matched$` / `pool_matched`, then call `join()` with the returned session name
  - Code: TypeScript and Python, minimal setup — create client, connect, enter pool, subscribe to matched event, join session on match
  - Explanation: describe the `groupSize` parameter, note that the server fires the match atomically, explain that matched clients are not auto-joined and must call `join()` themselves
  - Variations:
    - Attaching `attributes` to your pool entry (e.g., skill level, region)
    - Using `filter` to only match clients with compatible attributes (e.g., `{ region: "@self" }` to match same region)

- [ ] Create `docs/cookbook/pool-filtered-matching.md` — **Attribute filtering**
  - Problem: only pair clients that share a common attribute (e.g., same game mode, same language, compatible skill bracket)
  - Solution: pass `attributes` when entering the pool and a `filter` dict that constrains which members can be paired with you
  - Code: TypeScript and Python showing a skill-bracket filter — enter with `attributes: { skill: "intermediate" }` and `filter: { skill: "@self" }` so only same-skill clients match
  - Explanation: describe filter syntax — literal values match exactly, `"@self"` matches the entering client's own attribute value; server evaluates filters on both sides for mutual compatibility
  - Variations: numeric range filter (future), multiple filter keys

- [ ] Create `docs/cookbook/pool-delegated-matchmaker.md` — **Custom matchmaker with delegated mode**
  - Problem: you need control over how groups are formed — e.g., balanced teams, tournament brackets, or role-based assignment
  - Solution: one trusted client enters the pool as `role: "matchmaker"`, observes `members$` / `pool_members`, and calls `assign()` to form groups manually
  - Code: TypeScript and Python — matchmaker client enters with `{ mode: "delegated", role: "matchmaker", groupSize: 4 }`, subscribes to members observable, waits until enough members arrive, calls `pool.assign(poolName, [[id1, id2], [id3, id4]])` / `pool_assign`
  - Explanation: explain that `assign()` waits for `pool.assigned` confirmation; group members receive `pool.matched` and then call `join()` with the returned session; the matchmaker does not automatically join any session
  - Variations: matchmaker assigns unequal groups, matchmaker re-assigns after a client leaves

- [ ] Create `docs/cookbook/pool-repaired-on-disconnect.md` — **Re-pairing when a peer disconnects**
  - Problem: a matched session partner disconnects mid-session and you want to automatically find a new partner
  - Solution: when a peer leaves (`peers$` / `peers` drops to zero), re-enter the pool so the server can create a new match
  - Code: TypeScript and Python — subscribe to `peers$` / `client.peers`; when the list becomes empty, call `pool_enter` / `pool.enter` again with the same options; listen for `matched$` / `pool_matched` to join the new session
  - Explanation: emphasize leaving the old session with `client.leave()` before re-entering the pool; note that the server treats each `pool.enter` as a fresh queue entry
  - Variations: add a delay or user confirmation before re-pairing; limit re-pairing attempts with a counter

## Format Requirements

Each file must follow the structure used by existing cookbook recipes:

```
# Recipe Title

## Problem

One paragraph.

## Solution

One paragraph.

## Code

::: code-group
```typescript [TypeScript]
...
```
```python [Python]
...
```
:::

## Explanation

Bullet list of key points.

## Variations

### Variation Name
Short description + code snippet.
```

All code blocks must use actual SDK APIs. TypeScript uses `client.pool.enter(name, options)`, `client.pool.matched$.subscribe(cb)`, etc. Python uses `await client.pool_enter(PoolEnterOptions(...))`, `client.pool_matched.subscribe(cb)`, etc.

## Acceptance Criteria

- Four new files created: `pool-auto-pairing.md`, `pool-filtered-matching.md`, `pool-delegated-matchmaker.md`, `pool-repaired-on-disconnect.md`
- Each file follows the Problem / Solution / Code / Explanation / Variations structure used by existing recipes
- TypeScript and Python code blocks are present in every recipe
- Code uses the real SDK API surface (`client.pool.enter` / `pool_enter`, `pool.matched$` / `pool_matched`, etc.)
- The `docs/cookbook/index.md` is updated to list the four new recipes
