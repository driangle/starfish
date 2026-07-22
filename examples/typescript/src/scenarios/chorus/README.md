# Chorus

A performance where the audience is the instrument. Everyone raises their phone, and as
the performer plays, hundreds of phones sound together — low voices on one side of the
room, high voices on the other, all landing on the same beat.

**Starfish features:** presence, broadcast, clock sync.

- **Presence** sorts phones into voices and shows the performer the balance of the room.
- **Broadcast** sends each cue to every phone at once.
- **Clock sync** makes all of them play on the same beat.

## Run

Requires a Starfish server at `ws://localhost:8080/starfish` (see the
[Go server instructions](../../../../../servers/golang/README.md)).

```bash
# from examples/typescript
npm install
npm run build
npm run scenario:chorus
```

## What it does

The performer plus one phone per voice run in one process. Each phone syncs its clock
and announces its voice through presence. The performer broadcasts a cue per voice — a
note plus a server timestamp half a second ahead — using `latest` delivery, and each
phone plays at that exact moment via `clock.at`. A final `critical` broadcast cuts the
room to silence.

See the [scenario write-up](../../../../../docs/scenarios/chorus.md) for the narrative
and annotated code.
