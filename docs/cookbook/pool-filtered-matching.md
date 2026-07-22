# Attribute Filtering

## Problem

You only want to pair clients that share a common attribute — the same game mode, the
same language, or a compatible skill bracket — rather than matching anyone who happens to
be waiting.

## Solution

When entering an `auto` pool, pass `attributes` describing yourself and a `filter` that
constrains who you'll accept. The server pairs two members only when the filters on
**both** sides are satisfied. A literal filter value matches exactly; the special value
`"@self"` matches members whose attribute equals your own.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("lobby");

client.pool.matched$.subscribe(async ({ session }) => {
  await client.leave();
  await client.join(session);
});

// Only match other "intermediate" players.
await client.pool.enter("ranked", {
  groupSize: 2,
  mode: "auto",
  create: true,
  attributes: { skill: "intermediate" },
  filter: { skill: "@self" },
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, PoolEnterOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("lobby")

async def on_match(result):
    await client.leave()
    await client.join(result.session)

client.pool_matched.subscribe(on_match)

# Only match other "intermediate" players.
await client.pool_enter(PoolEnterOptions(
    pool="ranked",
    group_size=2,
    mode="auto",
    attributes={"skill": "intermediate"},
    filter={"skill": "@self"},
))
```

:::

## Explanation

- **Literal values** match exactly: `filter: { language: "en" }` pairs you only with
  members whose `language` attribute is `"en"`.
- **`"@self"`** matches members whose attribute equals *your own* value:
  `filter: { skill: "@self" }` pairs an `"intermediate"` player only with other
  `"intermediate"` players.
- **Both sides must be satisfied.** A match requires that each member's filter is
  satisfied by the other's attributes. If one side has no filter, it accepts anyone — but
  the other side's filter still constrains the pair.
- If a filter references an attribute the other member doesn't have, the filter fails and
  the pair is skipped.
- Filters apply to `auto` mode only. In claim-based and delegated modes, matching
  decisions are made by clients or the matchmaker, not the server.

## Variations

### Multiple filter keys (combined with AND)

All keys must be satisfied for a match to fire.

::: code-group

```typescript [TypeScript]
await client.pool.enter("ranked", {
  groupSize: 2,
  mode: "auto",
  create: true,
  attributes: { language: "en", region: "europe" },
  filter: { language: "@self", region: "@self" },
});
```

```python [Python]
await client.pool_enter(PoolEnterOptions(
    pool="ranked",
    group_size=2,
    mode="auto",
    attributes={"language": "en", "region": "europe"},
    filter={"language": "@self", "region": "@self"},
))
```

:::

### One-directional filter

Only one side needs to filter to constrain the pair. Here beginners are matched only with
other beginners, while everyone else accepts anyone.

::: code-group

```typescript [TypeScript]
// Beginner client — restrict to fellow beginners.
await client.pool.enter("ranked", {
  groupSize: 2,
  mode: "auto",
  create: true,
  attributes: { skill: "beginner" },
  filter: { skill: "@self" },
});
```

```python [Python]
# Beginner client — restrict to fellow beginners.
await client.pool_enter(PoolEnterOptions(
    pool="ranked",
    group_size=2,
    mode="auto",
    attributes={"skill": "beginner"},
    filter={"skill": "@self"},
))
```

:::
