# Constellation

A public installation built around a large projection wall. Anyone nearby opens the
app on their phone and becomes a point of light on the wall, placing themselves with a
touch. As the crowd grows the wall fills with stars, and every so often the whole sky
pulses at once — a shared moment that only works because everyone's phone acts together.

**Starfish features:** presence, broadcast, clock sync.

- **Presence** places and moves each person's star.
- **Broadcast** sends a single pulse cue to the whole crowd.
- **Clock sync** makes that cue land on every phone at the same instant.

## Run

Requires a Starfish server at `ws://localhost:8080/starfish` (see the
[Go server instructions](../../../../../servers/golang/README.md)).

```bash
# from examples/typescript
npm install
npm run build
npm run scenario:constellation
```

## What it does

The demo runs the whole piece in one process: a projection-wall client plus several
phone clients. Each phone syncs its clock, shares a star through presence, and waits.
When enough phones have joined, the wall picks a server time two seconds out and
broadcasts it. Every phone schedules its pulse with `clock.at`, so despite different
local clocks they all fire at the same real moment.

See the [scenario write-up](../../../../../docs/scenarios/constellation.md) for the
narrative and annotated code.
