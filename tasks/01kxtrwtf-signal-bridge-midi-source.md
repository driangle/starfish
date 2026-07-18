---
title: "Signal bridge: MIDI source"
id: "01kxtrwtf"
status: pending
priority: medium
type: feature
tags: ["bridge", "midi"]
created_at: "2026-07-18"
---

# Signal bridge: MIDI source

## Objective

Implement the MIDI `BridgeSource` for the signal bridge CLI. The source lists available MIDI devices, opens a selected device, and forwards incoming MIDI messages (note on/off, CC, pitch bend, etc.) to a starfish topic. Optionally supports output direction for sending starfish messages back to a MIDI device.

### CLI Usage

```bash
starfish-bridge midi --server ws://localhost:8080/starfish --session jam --topic midi-in --device "Launchpad Pro"
```

## Tasks

- [ ] Implement MIDI source in `sources/midi.ts` conforming to `BridgeSource` interface
- [ ] Add device listing/selection (--device flag, list available devices if omitted)
- [ ] Parse incoming MIDI messages into structured payloads (type, channel, note, velocity, cc, value)
- [ ] Support output direction: subscribe to starfish topic and send MIDI messages to the device
- [ ] Add tests with mocked MIDI input

## Acceptance Criteria

- Running `starfish-bridge midi --server ... --session ... --topic ... --device "..."` opens the MIDI device and publishes incoming MIDI messages to the specified starfish topic
- MIDI messages are published as structured JSON payloads (e.g. `{ type: "noteOn", channel: 0, note: 60, velocity: 127 }`)
- Running without `--device` lists available MIDI devices and exits
- The source cleans up the MIDI device on shutdown
