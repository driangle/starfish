# Random Pairing with Auto Mode

## Problem

You want to pair two strangers automatically — no lobby, no invite code, no client-side
negotiation. Whoever is waiting should be matched with the next person to arrive.

## Solution

Enter a pool with `mode: "auto"`. The server pairs waiting members in FIFO order once
`groupSize` clients are available and sends each a `matched` event carrying a new session
name. Listen for that event, then call `join()` with the returned session.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();

// You must be in a session before entering a pool.
await client.join("lobby");

// When the server matches you, join the session it created.
client.pool.matched$.subscribe(async ({ session, peers }) => {
  console.log("Matched with", peers.map((p) => p.id));
  await client.leave();       // leave the lobby
  await client.join(session); // join the matched session
});

// Enter the pool. create: true opens it if it doesn't exist yet.
await client.pool.enter("duets", { groupSize: 2, mode: "auto", create: true });
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, PoolEnterOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()

# You must be in a session before entering a pool.
await client.join("lobby")

# When the server matches you, join the session it created.
async def on_match(result):
    print("Matched with", [p.id for p in result.peers])
    await client.leave()
    await client.join(result.session)

client.pool_matched.subscribe(on_match)

# Enter the pool. create=True (the default) opens it if it doesn't exist yet.
await client.pool_enter(PoolEnterOptions(pool="duets", group_size=2, mode="auto"))
```

:::

## Explanation

- **`groupSize`** sets how many clients form one match — `2` for pairs, higher for
  groups. It is fixed when the pool is created.
- The server fires the match **atomically**: all members of a group are removed from the
  pool and notified together, so there are no partial matches.
- Matched clients are **not** auto-joined. You receive the session name and call `join()`
  yourself — this gives you a moment to show a "matched" screen or load assets first.
- `create: true` opens the pool on first entry. In TypeScript, omitting `create` means
  the pool is only used if it already exists; in Python, `create` defaults to `True`.

## Variations

### Attach attributes to your entry

Attributes are opaque metadata carried with your pool membership — useful for filtering
or for display in claim-based modes.

::: code-group

```typescript [TypeScript]
await client.pool.enter("duets", {
  groupSize: 2,
  mode: "auto",
  create: true,
  attributes: { skill: "intermediate", region: "eu" },
});
```

```python [Python]
await client.pool_enter(PoolEnterOptions(
    pool="duets",
    group_size=2,
    mode="auto",
    attributes={"skill": "intermediate", "region": "eu"},
))
```

:::

### Only match a compatible region

Add a `filter` so the server only pairs you with members whose attributes match. `"@self"`
means "the same value as my own attribute." See
[Attribute Filtering](./pool-filtered-matching) for details.

::: code-group

```typescript [TypeScript]
await client.pool.enter("duets", {
  groupSize: 2,
  mode: "auto",
  create: true,
  attributes: { region: "eu" },
  filter: { region: "@self" }, // only match same-region members
});
```

```python [Python]
await client.pool_enter(PoolEnterOptions(
    pool="duets",
    group_size=2,
    mode="auto",
    attributes={"region": "eu"},
    filter={"region": "@self"},  # only match same-region members
))
```

:::
