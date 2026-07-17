---
title: "Add pool matchmaking example to Python example project"
id: "01kxjn8st"
status: completed
priority: medium
type: feature
tags: ["pool", "example", "python"]
created_at: "2026-07-15"
dependencies: ["01kxjn8nt"]
phase: v0.1.1
completed_at: 2026-07-17
---

# Add pool matchmaking example to Python example project

## Objective

Add a `pool_matchmaking.py` example to `examples/python/` that demonstrates the "distant-touch" use case: two clients enter the same pool in `auto` mode, the server pairs them, and they join the matched session and exchange a message over pub/sub. This shows the simplest end-to-end pool flow using the Python SDK.

## Tasks

- [x] Create `examples/python/pool_matchmaking.py`:
  - Add the standard file header comment block (describes what is demonstrated, how to run it, what the server requirement is).
  - Use the same `create_client` helper pattern from `pubsub.py` and `shared_data.py` to create two `StarfishClient` instances (`client_a`, `client_b`).
  - Connect both clients and join a staging session (e.g. `"pool-matchmaking-staging"`) so they are eligible to enter a pool (pools require an active session).
  - Subscribe each client to the pool matched event (e.g. `client.pool.matched.subscribe(...)`) before calling `pool.enter()` so no event is missed.
  - Call `await client.pool.enter("distant-touch", groupSize=2)` (or equivalent SDK call shape) on both clients concurrently via `asyncio.gather`.
  - When a client receives the match event, log the matched session name and peer IDs, then call `await client.join(event.session)` to move into the matched session.
  - Once both clients are in the matched session, have one subscribe to a `"ping"` topic, have the other publish to it, and log what is received.
  - Disconnect both clients and exit cleanly.

## Acceptance Criteria

- Running `python pool_matchmaking.py` prints both clients entering the pool, a match event with the shared session name, and the ping message received by the peer.
- The example follows the same code structure and comment style as the existing examples in `examples/python/`.
- No helper utilities or abstractions are introduced beyond what the SDK exports.
- The example runs successfully with `asyncio.run(main())` and exits with code 0.
