---
title: "Add pool matchmaking to user guide documentation"
id: "01kxkvkkf"
status: completed
priority: medium
type: feature
tags: ["pool", "docs", "guide"]
dependencies: ["01kxjn8mq"]
created_at: "2026-07-15"
completed_at: 2026-07-21
---

# Add pool matchmaking to user guide documentation

## Objective

Extend the user guide at `docs/guide/` to cover pool matchmaking as a first-class feature. Readers should understand what pools are, when to use each mode, and how to wire pool entry and match handling into a complete flow.

## Background

The TS SDK (`sdks/typescript/src/pool.ts`, `pool-types.ts`) and Python SDK (`sdks/python/starfish/pool.py`) now implement pool matchmaking. The user guide currently covers sessions, topics, presence, data, and direct messaging. Pools are the natural next concept because they determine *which* session a client joins rather than what happens inside one.

Five pool modes are supported:

| Mode | Description |
|------|-------------|
| `auto` | Server pairs clients automatically when `groupSize` is reached |
| `claim` | Clients see the member list and explicitly claim a partner |
| `mutual` | Both sides must claim each other before a match fires |
| `propose` | One side proposes; the other accepts or rejects |
| `delegated` | A dedicated matchmaker client calls `pool.assign` to form groups |

## Tasks

- [x] Add a **Pools** section to `docs/guide/core-concepts.md` after the Sessions section:
  - Explain that a pool is a named matchmaking queue that pairs clients into a server-generated session
  - Describe the five modes (`auto`, `claim`, `mutual`, `propose`, `delegated`) in a table
  - Show `pool_enter` / `pool.enter` in TypeScript and Python with `mode: "auto"` as the minimal example
  - Show how to listen for `pool_matched` / `pool.matched$` and then call `join()` with the returned session name
  - Mention `pool_members` / `pool.members$` for claim-based modes
  - Note that pools operate over WebSocket only (no RTC transport for pool frames)

- [x] Add a **Pool Matchmaking** workflow to `docs/guide/workflows.md`:
  - Auto-pairing workflow: enter pool, await match, join session
  - Claim workflow: enter pool, observe members, claim a partner, await match
  - Propose/accept workflow: enter pool, listen for proposals, accept or reject
  - Delegated workflow: matchmaker enters pool with `role: "matchmaker"`, observes members, calls `assign`
  - Each workflow should have TypeScript and Python code blocks following the existing `::: code-group` format

- [x] Update `docs/guide/quick-start.md` if appropriate:
  - Add a brief note in "Next Steps" pointing to pool matchmaking as the way to let strangers find each other before joining a session (one line is sufficient — no new code blocks needed)

- [x] Update `docs/guide/api-overview.md`:
  - Add a **Pool** section to the StarfishClient Methods table, listing all pool methods and their return types
  - TypeScript API: `pool.enter(name, options)`, `pool.leave(name)`, `pool.claim(name, targetId)`, `pool.accept(name, fromId)`, `pool.reject(name, fromId)`, `pool.assign(name, groups)`, `pool.members$`, `pool.matched$`, `pool.proposal$`, `pool.claimRejected$`
  - Python API: `pool_enter(options)`, `pool_leave(pool)`, `pool_claim(pool, target)`, `pool_accept(pool, from_)`, `pool_reject(pool, from_)`, `pool_assign(pool, groups)`, `pool_members(pool)`, `pool_matched` property
  - Add `PoolEnterOptions`, `PoolMember`, `PoolMatchedEvent` / `PoolMatchResult` to the Key Types section

## Acceptance Criteria

- `docs/guide/core-concepts.md` has a Pools section explaining all five modes with working code examples in TypeScript and Python
- `docs/guide/workflows.md` has a Pool Matchmaking workflow section covering auto, claim, and at least one of propose/delegated, with both TypeScript and Python code blocks
- `docs/guide/api-overview.md` lists all pool methods and types for both TypeScript and Python
- `docs/guide/quick-start.md` references pool matchmaking in its Next Steps section
- All code examples use the actual SDK APIs as implemented (`pool.enter` / `pool_enter`, `pool.matched$` / `pool_matched`, etc.)
- No new files are created — all changes are edits to existing guide files
