# The Long Mural

A single canvas, endlessly wide, that anyone can draw on and that never resets. People
who never meet add strokes side by side over months — a stretch of city drawings gives
way to a field of flowers, then a wall of names. Whatever you add is still there when
you come back.

The piece leans on three Starfish features:

- **[Shared data](../cookbook/shared-state)** to store strokes so they persist and merge cleanly.
- **[Scopes](../guide/core-concepts#scopes)** to keep the shared canvas separate from your private settings.
- **[Optimistic concurrency](../guide/core-concepts#optimistic-concurrency)** to protect the rare destructive edit.

**[Shared data](../cookbook/shared-state) — strokes that last and merge.** The canvas is split into tiles, each a
key in session data. Adding a stroke appends to that tile, so two people drawing at
once never overwrite each other.

```ts
await client.join("the-long-mural");

function commitStroke(tileKey, stroke) {
  client.save({ key: tileKey, scope: "session", op: "list.add", data: [stroke] });
}

// Watch the tiles on screen and redraw as strokes arrive.
client.key$(tileKey).subscribe((result) => redrawTile(tileKey, result.data));
```

A running total of every stroke ever made is just as safe to share, using a counter
that stays correct even under simultaneous edits.

```ts
client.save({ key: "stroke-count", scope: "session", op: "counter.add", data: 1 });
client.key$("stroke-count").subscribe((result) => showCounter(result.data));
```

**[Scopes](../guide/core-concepts#scopes) — shared vs. private.** The `session` scope is the shared canvas everyone
sees. The `self` scope is private to you and follows you between visits — a natural fit
for your brush settings.

```ts
client.save({
  key: "my-brush",
  scope: "self",
  op: "replace",
  data: { color: "#c94f7c", width: 3 },
});
```

**[Optimistic concurrency](../guide/core-concepts#optimistic-concurrency) — safe overwrites.** Most drawing only adds, but some actions
replace — like a moderator clearing a defaced tile. A version check makes sure that
only succeeds if nobody has touched the tile in the meantime.

```ts
const tile = await client.get({ key: "tile:0042:0017", scope: "session" });

await client.save({
  key: "tile:0042:0017",
  scope: "session",
  op: "replace",
  data: [],
  expectedVersion: tile.version, // rejected if the tile changed since we read it
});
```

Everyone paints at once, nothing is lost, and the mural just keeps growing.
