---
title: "Add pool matchmaking example to TypeScript example project"
id: "01kxjn8rv"
status: pending
priority: medium
type: feature
tags: ["pool", "example", "typescript"]
created_at: "2026-07-15"
dependencies: ["01kxjn8mq"]
phase: v0.1.1
---

# Add pool matchmaking example to TypeScript example project

## Objective

Add a `pool-matchmaking.ts` example to `examples/typescript/src/` that demonstrates the "distant-touch" use case: two clients enter the same pool in `auto` mode, the server pairs them, and they join the matched session and exchange a message over pub/sub. This shows the simplest end-to-end pool flow using the TypeScript SDK.

## Tasks

- [ ] Create `examples/typescript/src/pool-matchmaking.ts`:
  - Add the standard file header comment block (describes what is demonstrated, how to run it, what the server requirement is).
  - Create two `StarfishClient` instances (`clientA`, `clientB`) following the `createClient` helper pattern used in `pubsub.ts` and `presence.ts`.
  - Connect both clients and join a staging session (e.g. `"pool-matchmaking-staging"`) so they are eligible to enter a pool (pools require an active session).
  - Subscribe each client to `pool.matched$` before calling `pool.enter()` so no event is missed.
  - Call `client.pool.enter("distant-touch", { groupSize: 2 })` on both clients.
  - When each client's `pool.matched$` emits, log the matched session name and peer IDs, then call `client.join(event.session)` to move into the matched session.
  - Once both clients are in the matched session, have one client publish a `"ping"` message and have the other log what it receives.
  - Disconnect both clients and exit cleanly.
- [ ] Add a `"pool-matchmaking"` script to `examples/typescript/package.json` that runs `node dist/pool-matchmaking.js`.

## Acceptance Criteria

- Running `npm run pool-matchmaking` (after `npm run build`) prints both clients entering the pool, a match event with the shared session name, and the ping message received by the peer.
- The example follows the same code structure and comment style as the existing examples in `examples/typescript/src/`.
- No custom types or abstractions are introduced beyond what the SDK exports.
- The example compiles without errors under the project's `tsconfig.json`.
