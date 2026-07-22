# Duet

An app for moving with a stranger. You open it, start swaying with your phone in hand,
and moments later a second figure appears on screen mirroring your motion — another
person, somewhere else, paired with you automatically. No lobby, no invite, no names.

**Starfish features:** pools, WebRTC, unreliable delivery.

- **Pools** pair two people without a shared room name.
- **WebRTC** gives them a direct, low-latency link.
- **Unreliable delivery** keeps motion fluid instead of stuttering.

## Run

Requires a Starfish server at `ws://localhost:8080/starfish` (see the
[Go server instructions](../../../../../servers/golang/README.md)).

```bash
# from examples/typescript
npm install
npm run build
npm run scenario:duet
```

## What it does

Both dancers run in one process. They enter a pool; the server pairs them into a
private session; then each streams motion frames to the other with `unreliable`,
`unordered` delivery.

**On transport:** in a browser the motion channel would be WebRTC (`preferTransport:
"rtc"`, opened with `client.connectRTC()`). WebRTC needs a peer-connection factory that
isn't available in plain Node, so this demo uses the automatic WebSocket fallback
(`fallback: true`). The delivery semantics are identical — only the underlying transport
differs. See the [WebRTC cookbook](../../../../../docs/cookbook/webrtc-data-channels.md)
for enabling the RTC transport.

See the [scenario write-up](../../../../../docs/scenarios/duet.md) for the narrative and
annotated code.
