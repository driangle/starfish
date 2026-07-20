---
title: "Signal bridge: MIDI connector"
id: "01kxtrwtf"
status: pending
priority: medium
type: feature
tags: ["bridge", "midi"]
created_at: "2026-07-18"
---

# Signal bridge: MIDI connector

## Objective

Implement the MIDI `BridgeConnector` for the signal bridge CLI. Supports all three directions (relative to starfish): `in` forwards incoming MIDI messages (note on/off, CC, pitch bend, etc.) from a device to a starfish topic; `out` sends topic messages back to the device; `both` runs both on the same device. See the core task (`01kxtrwnb`) for the shared direction convention.

### CLI Usage

```bash
# in: device → topic
starfish-bridge midi in   --server ws://localhost:8080/starfish --session jam --topic midi --device "Launchpad Pro"

# out: topic → device
starfish-bridge midi out  --server ws://localhost:8080/starfish --session jam --topic midi --device "Launchpad Pro"

# both: bidirectional
starfish-bridge midi both --server ws://localhost:8080/starfish --session jam --topic midi --device "Launchpad Pro"
```

## Tasks

- [ ] Implement MIDI connector in `connectors/midi.ts` conforming to `BridgeConnector` interface, advertising support for `in`, `out`, and `both`
- [ ] Add device listing/selection (--device flag, list available devices if omitted); open the input port for `in`, the output port for `out`, both for `both`
- [ ] `in`: parse incoming MIDI messages into structured payloads (type, channel, note, velocity, cc, value) and publish to the topic
- [ ] `out`: subscribe to the starfish topic and translate structured payloads back into MIDI messages sent to the device
- [ ] Add tests with mocked MIDI input and output

## Acceptance Criteria

- Running `starfish-bridge midi in ... --device "..."` opens the device input and publishes incoming MIDI to the topic
- MIDI messages are published as structured JSON payloads (e.g. `{ type: "noteOn", channel: 0, note: 60, velocity: 127 }`)
- Running without `--device` lists available MIDI devices and exits
- Running `starfish-bridge midi out ...` subscribes to the topic and translates structured payloads back into valid MIDI messages sent to the device
- Running `starfish-bridge midi both ...` does both simultaneously on the same device
- The connector cleans up the MIDI device on shutdown
