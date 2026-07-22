# The Long Mural

A single canvas, endlessly wide, that anyone can draw on and that never resets. People
who never meet add strokes side by side over months. Whatever you add is still there
when you come back.

**Starfish features:** shared data, scopes, optimistic concurrency.

- **Shared data** stores strokes so they persist and merge cleanly.
- **Scopes** keep the shared canvas separate from your private settings.
- **Optimistic concurrency** protects the rare destructive edit.

## Run

Requires a Starfish server at `ws://localhost:8080/starfish` (see the
[Go server instructions](../../../../../servers/golang/README.md)).

```bash
# from examples/typescript
npm install
npm run build
npm run scenario:the-long-mural
```

## What it does

Two painters draw onto shared tiles at the same time. Strokes are appended with
`list.add`, so concurrent writes are never lost; a shared `counter.add` tracks the
total; a private brush lives in the `self` scope; and a moderator clears a tile using
an `expectedVersion` check so the overwrite only lands if nobody touched it first.

See the [scenario write-up](../../../../../docs/scenarios/the-long-mural.md) for the
narrative and annotated code.
