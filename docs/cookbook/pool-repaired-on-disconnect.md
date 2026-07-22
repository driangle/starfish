# Re-pairing When a Peer Disconnects

## Problem

Two clients were matched into a session, but one disconnects mid-session. You want the
remaining client to automatically find a new partner instead of being left alone.

## Solution

Watch the session's peer list. When your partner leaves and the peer count drops to zero,
leave the now-empty session and re-enter the pool. The server treats each `enter` as a
fresh queue entry, so you'll be matched with the next available client.

## Code

::: code-group

```typescript [TypeScript]
import { StarfishClient } from "@starfish/sdk";

const client = new StarfishClient({ server: "ws://localhost:4000" });
await client.connect();

const POOL = "duets";
const enterOptions = { groupSize: 2, mode: "auto" as const, create: true };

// Join the matched session and start watching for a lonely session.
client.pool.matched$.subscribe(async ({ session }) => {
  await client.leave();
  await client.join(session);
});

// If our partner disconnects, re-enter the pool.
client.peers$.subscribe(async (peers) => {
  if (client.clientId && peers.length === 0 && inMatchedSession()) {
    await client.leave();           // leave the empty session
    await client.join("lobby");     // return to a staging session
    await client.pool.enter(POOL, enterOptions); // queue up again
  }
});

await client.join("lobby");
await client.pool.enter(POOL, enterOptions);
```

```python [Python]
from starfish import StarfishClient, StarfishClientOptions, PoolEnterOptions

client = StarfishClient(StarfishClientOptions(server="ws://localhost:4000"))
await client.connect()

POOL = "duets"

def enter_options():
    return PoolEnterOptions(pool=POOL, group_size=2, mode="auto")

# Join the matched session.
async def on_match(result):
    await client.leave()
    await client.join(result.session)

client.pool_matched.subscribe(on_match)

# If our partner disconnects, re-enter the pool.
async def on_peers(peers):
    if len(peers) == 0 and in_matched_session():
        await client.leave()
        await client.join("lobby")
        await client.pool_enter(enter_options())

client.peers.subscribe(on_peers)

await client.join("lobby")
await client.pool_enter(enter_options())
```

:::

## Explanation

- **Leave the old session first.** Call `client.leave()` before re-entering the pool so
  you're not still holding a dead session when the new match arrives.
- Each `pool.enter` / `pool_enter` is an independent queue entry — the server has no
  memory of your previous match, so re-entering simply puts you back in line.
- Guard the re-pair logic so it only fires for a genuinely empty *matched* session, not
  for the staging lobby or the moment before your first match. Track a small flag (shown
  here as `inMatchedSession()` / `in_matched_session()`) that you set when you join a
  matched session.
- A disconnecting peer triggers a peer-list update; the same code path handles a partner
  who leaves voluntarily.

## Variations

### Confirm before re-pairing

Instead of re-entering immediately, prompt the user or wait a moment in case the partner
reconnects.

```typescript
client.peers$.subscribe(async (peers) => {
  if (peers.length === 0 && inMatchedSession()) {
    const again = await askUser("Your partner left. Find someone new?");
    if (again) {
      await client.leave();
      await client.join("lobby");
      await client.pool.enter("duets", { groupSize: 2, mode: "auto", create: true });
    }
  }
});
```

### Limit re-pairing attempts

Keep a counter and stop after a few tries so a client doesn't loop forever in an empty
pool.

```typescript
let attempts = 0;
client.peers$.subscribe(async (peers) => {
  if (peers.length === 0 && inMatchedSession() && attempts < 3) {
    attempts++;
    await client.leave();
    await client.join("lobby");
    await client.pool.enter("duets", { groupSize: 2, mode: "auto", create: true });
  }
});
```
