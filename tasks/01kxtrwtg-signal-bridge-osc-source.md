---
title: "Signal bridge: OSC source"
id: "01kxtrwtg"
status: pending
priority: medium
type: feature
tags: ["bridge", "osc"]
created_at: "2026-07-18"
---

# Signal bridge: OSC source

## Objective

Implement the OSC `BridgeSource` for the signal bridge CLI. The source listens on a UDP port for incoming OSC messages and forwards them to a starfish topic. Optionally supports output direction for sending starfish messages as OSC to a target host/port.

### CLI Usage

```bash
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc-in --port 9000
```

## Tasks

- [ ] Implement OSC source in `sources/osc.ts` conforming to `BridgeSource` interface
- [ ] Listen on configurable UDP port for incoming OSC messages
- [ ] Parse OSC messages into structured payloads (address, args with types)
- [ ] Support output direction: subscribe to starfish topic and send OSC messages to a target host/port (--out-host, --out-port)
- [ ] Handle OSC bundles (timetag + multiple messages)
- [ ] Add tests with mocked OSC input

## Acceptance Criteria

- Running `starfish-bridge osc --server ... --session ... --topic ... --port 9000` listens for OSC on UDP port 9000 and publishes to the starfish topic
- OSC messages are published as structured JSON (e.g. `{ address: "/synth/freq", args: [440.0] }`)
- OSC bundles are unpacked into individual messages
- The source cleans up the UDP socket on shutdown
