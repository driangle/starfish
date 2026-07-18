---
title: "Add signal bridge CLI for proxying external sources (MIDI, OSC, MQTT, DMX/Art-Net, Serial) into starfish topics"
id: "01kxfmdyt"
status: pending
priority: medium
type: feature
tags: ["bridge", "cli", "midi", "osc", "mqtt", "dmx", "serial"]
created_at: "2026-07-14"
---

# Add signal bridge CLI for proxying external sources (MIDI, OSC, MQTT, DMX/Art-Net, Serial) into starfish topics

## Objective

Create a `@starfish/bridge` CLI package that receives external signals (MIDI, OSC, MQTT, DMX/Art-Net, Serial) and publishes them to starfish topics. The bridge acts as a protocol translator — it connects to a starfish session on one side and listens to an external source on the other, forwarding incoming messages as topic publishes.

This is distinct from existing adapters (p5.js, Three.js), which are framework wrappers. Bridges live in a new top-level `bridges/` directory.

### CLI Interface

```bash
# General shape
starfish-bridge <source> --server <url> --session <name> --topic <topic> [source-specific flags]

# MIDI
starfish-bridge midi --server ws://localhost:8080/starfish --session jam --topic midi-in --device "Launchpad Pro"

# OSC
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc-in --port 9000

# MQTT
starfish-bridge mqtt --server ws://localhost:8080/starfish --session install --topic iot-in --broker mqtt://localhost:1883 --subscribe "sensors/#"

# DMX/Art-Net
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx-out --universe 0 --direction out

# Serial
starfish-bridge serial --server ws://localhost:8080/starfish --session sensors --topic serial-in --port /dev/ttyUSB0 --baud 115200 --framing newline
```

### Project Structure

```
bridges/
└── bridge/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts               # CLI entry point (arg parsing, orchestration)
    │   ├── types.ts              # BridgeSource interface
    │   ├── sources/
    │   │   ├── midi.ts           # MIDI source
    │   │   ├── osc.ts            # OSC source
    │   │   ├── mqtt.ts           # MQTT source
    │   │   ├── artnet.ts         # DMX/Art-Net source
    │   │   └── serial.ts         # Serial (USB/UART) source
    │   └── starfish.ts           # Shared connect/join/publish logic
    └── bin/
        └── starfish-bridge.js    # Shebang entry point
```

## Tasks

- [ ] Scaffold `bridges/bridge/` project (package.json, tsconfig, eslint, bin entry point)
- [ ] Define `BridgeSource` interface (name, flags, start/stop lifecycle)
- [ ] Implement shared starfish connection logic (connect, join session, publish helper)
- [ ] Implement CLI arg parsing with subcommands per source type and common flags (--server, --session, --topic, --create-session, --reliability, --transport)
- [ ] Implement MIDI source using a Node.js MIDI library (list devices, open device, forward note/CC/etc messages)
- [ ] Implement OSC source using an OSC library (listen on UDP port, forward OSC messages)
- [ ] Implement MQTT source using an MQTT client library (connect to broker, subscribe to topic patterns, forward messages bidirectionally)
- [ ] Implement Art-Net source using an Art-Net/DMX library (send/receive DMX universe data over UDP, map channels to topic payloads, support both input and output directions)
- [ ] Implement Serial source using a serial port library (open port, configure baud/framing, forward delimited messages bidirectionally)
- [ ] Add Makefile targets for build, lint, test, format
- [ ] Add a README with usage examples

## Acceptance Criteria

- Running `starfish-bridge midi --server ... --session ... --topic ...` connects to starfish, opens a MIDI device, and publishes incoming MIDI messages to the specified topic
- Running `starfish-bridge osc --server ... --session ... --topic ... --port 9000` listens for OSC messages on the given UDP port and publishes them to the specified topic
- Running `starfish-bridge mqtt --server ... --session ... --topic ... --broker mqtt://... --subscribe "sensors/#"` subscribes to MQTT topics on the broker and publishes matching messages to the starfish topic (and optionally bridges starfish messages back to MQTT)
- Running `starfish-bridge artnet --server ... --session ... --topic ... --universe 0 --direction out` bridges DMX channel data between a starfish topic and an Art-Net universe (supports both input from fixtures and output to fixtures)
- Running `starfish-bridge serial --server ... --session ... --topic ... --port /dev/ttyUSB0 --baud 115200 --framing newline` opens a serial port and bridges newline-delimited (or custom-framed) messages bidirectionally with a starfish topic
- Common flags (--server, --session, --topic) work consistently across all source types
- The CLI prints helpful errors when required args are missing or a device/port can't be opened
- Adding a new source type requires only implementing the `BridgeSource` interface and registering it — no changes to core CLI logic
- The project builds, lints, and passes validation via Makefile targets
