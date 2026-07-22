# Custom Matchmaker with Delegated Mode

## Problem

You need control over how groups are formed — balanced teams, tournament brackets, or
role-based assignment — rather than letting the server pair members automatically.

## Solution

Use `delegated` mode. One trusted client enters the pool with `role: "matchmaker"`. It
receives member-join and member-leave events (regular members stay invisible to each
other), observes the member list, and calls `assign()` to form groups explicitly. Each
assigned member receives a `matched` event and joins the returned session; the matchmaker
stays in the pool and can assign again.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();
await client.join("lobby");

// Watch members arrive and assign groups of two once four are waiting.
client.pool.members$.subscribe((members) => {
  if (members.length >= 4) {
    const ids = members.map((m) => m.id);
    client.pool.assign("teams", [
      [ids[0], ids[1]],
      [ids[2], ids[3]],
    ]);
  }
});

// Enter as the matchmaker.
await client.pool.enter("teams", {
  groupSize: 2,
  mode: "delegated",
  role: "matchmaker",
  create: true,
});
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, PoolEnterOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()
await client.join("lobby")

# Watch members arrive and assign groups of two once four are waiting.
async def on_members(members):
    if len(members) >= 4:
        ids = [m.id for m in members]
        await client.pool_assign("teams", [[ids[0], ids[1]], [ids[2], ids[3]]])

client.pool_members("teams").subscribe(on_members)

# Enter as the matchmaker.
await client.pool_enter(PoolEnterOptions(
    pool="teams",
    group_size=2,
    mode="delegated",
    role="matchmaker",
))
```

:::

Regular members just enter the pool and wait for `matched` — they never call `assign()`:

::: code-group

```typescript [TypeScript]
await client.join("lobby");
client.pool.matched$.subscribe(async ({ session }) => {
  await client.leave();
  await client.join(session);
});
await client.pool.enter("teams", { groupSize: 2, mode: "delegated" });
```

```python [Python]
await client.join("lobby")

async def on_match(result):
    await client.leave()
    await client.join(result.session)

client.pool_matched.subscribe(on_match)

await client.pool_enter(PoolEnterOptions(pool="teams", group_size=2, mode="delegated"))
```

:::

## Explanation

- Only clients with `role: "matchmaker"` can call `assign()` in a delegated pool. Regular
  members can't see each other or send claims.
- `assign()` waits for the server's confirmation that every referenced client is a current
  member and every group matches the pool's `groupSize`.
- Assigned members receive `matched` with a server-generated session name and then call
  `join()` themselves — they are not auto-joined.
- The matchmaker is **not** consumed by matching. It stays in the pool and can assign more
  groups as members arrive.
- A matchmaker that disconnects doesn't affect waiting members; a new matchmaker can enter
  at any time.

## Variations

### Unequal or role-based groups

Because you build the groups yourself, they don't have to be uniform picks — you can pair
by role, seed brackets, or balance skill. (Each group must still contain `groupSize`
members.)

```typescript
// Pair each "healer" with a "tank" from the member list.
const healers = members.filter((m) => m.attributes?.role === "healer");
const tanks = members.filter((m) => m.attributes?.role === "tank");

const groups = healers
  .map((h, i) => (tanks[i] ? [h.id, tanks[i].id] : null))
  .filter((g): g is string[] => g !== null);

if (groups.length > 0) client.pool.assign("teams", groups);
```

### Re-assign after a member leaves

`members$` / `pool_members` updates on every join and leave, so you can recompute groups
whenever the roster changes — for example, holding a partially-filled bracket until a
replacement arrives.
