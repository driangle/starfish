# Wander

A message in a bottle. There's no feed, no profile, no followers — just one line of
writing at a time, sent to a random stranger somewhere in the world. You might keep the
note you receive, or write one line back into the dark for whoever wanders past next.

**Starfish features:** direct messaging, request/reply.

- **Direct messaging** delivers each note to exactly one person.
- **A request/reply handshake** ensures a note only goes to someone who's listening.

## Run

Requires a Starfish server at `ws://localhost:8080/starfish` (see the
[Go server instructions](../../../../../servers/golang/README.md)).

```bash
# from examples/typescript
npm install
npm run build
npm run scenario:wander
```

## What it does

Three wanderers share a session. One knocks — a quiet "is anyone there?" — and the
knock/reply is correlated with an id carried in the message payload. When someone
answers, the sender delivers a single note directly to them, with the sender's local
hour included in the payload. (Per the protocol, application data belongs in `payload`,
not the header.)

See the [scenario write-up](../../../../../docs/scenarios/wander.md) for the narrative
and annotated code.
