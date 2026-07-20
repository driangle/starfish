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

Create a `@starfish/bridge` CLI package that bridges external signals (MIDI, OSC, MQTT, DMX/Art-Net, Serial) with starfish topics **in either direction**. The bridge acts as a protocol translator — it connects to a starfish session on one side and an external endpoint on the other, forwarding external signals into topic publishes (`in`), driving external endpoints from topic messages (`out`), or both.

This is distinct from existing adapters (p5.js, Three.js), which are framework wrappers. Bridges live in a new top-level `bridges/` directory.

### Direction convention

Each protocol is exposed as a **connector** (not a "source" — connectors move data both ways). Every connector takes a universal `--direction <in|out|both>` flag whose meaning is **always relative to starfish**:

| `--direction` | Data flow | Meaning |
|---------------|-----------|---------|
| `in` (default) | external endpoint → starfish topic | ingest external signals into starfish |
| `out` | starfish topic → external endpoint | drive external endpoints from starfish |
| `both` | external ↔ starfish | bidirectional bridge |

### CLI Interface

```bash
# General shape
starfish-bridge <connector> --server <url> --session <name> --topic <topic> [--direction in|out|both] [connector-specific flags]

# MIDI — in: device notes/CC → topic (default); out: topic → device; both: bidirectional
starfish-bridge midi --server ws://localhost:8080/starfish --session jam --topic midi --device "Launchpad Pro" --direction both

# OSC — in: listen on UDP --in-port; out: send to --out-host/--out-port
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc --direction in --in-port 9000
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc --direction out --out-host 127.0.0.1 --out-port 9000

# MQTT — in: --subscribe broker topics → starfish topic; out: starfish topic → --publish-to broker topic
starfish-bridge mqtt --server ws://localhost:8080/starfish --session install --topic iot --broker mqtt://localhost:1883 --direction in --subscribe "sensors/#"

# DMX/Art-Net — out: topic → Art-Net universe (control lights); in: Art-Net → topic (read a console)
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx --universe 0 --direction out

# Serial — in: port → topic (default); out: topic → port; both: bidirectional (same port)
starfish-bridge serial --server ws://localhost:8080/starfish --session sensors --topic serial --port /dev/ttyUSB0 --baud 115200 --framing newline --direction both
```

### Project Structure

```
bridges/
└── bridge/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts               # CLI entry point (arg parsing, orchestration)
    │   ├── types.ts              # BridgeConnector interface + Direction type
    │   ├── connectors/
    │   │   ├── midi.ts           # MIDI connector
    │   │   ├── osc.ts            # OSC connector
    │   │   ├── mqtt.ts           # MQTT connector
    │   │   ├── artnet.ts         # DMX/Art-Net connector
    │   │   └── serial.ts         # Serial (USB/UART) connector
    │   └── starfish.ts           # Shared connect/join/publish/subscribe logic
    └── bin/
        └── starfish-bridge.js    # Shebang entry point
```

## Tasks

- [ ] Scaffold `bridges/bridge/` project (package.json, tsconfig, eslint, bin entry point)
- [ ] Define `Direction` type (`in | out | both`) and the `BridgeConnector` interface (name, supported directions, flags, start/stop lifecycle)
- [ ] Implement shared starfish connection logic (connect, join session, publish helper for the `in` path, subscribe helper for the `out` path)
- [ ] Implement CLI arg parsing with subcommands per connector and common flags (--server, --session, --topic, --direction, --create-session, --reliability, --transport); default --direction to `in`
- [ ] Implement MIDI connector using a Node.js MIDI library (list devices, open device; `in` forwards notes/CC/etc to a topic, `out` sends topic messages back to the device, `both` runs both)
- [ ] Implement OSC connector using an OSC library (`in` listens on `--in-port` and forwards to a topic; `out` sends topic messages as OSC to `--out-host`/`--out-port`)
- [ ] Implement MQTT connector using an MQTT client library (`in` subscribes to broker `--subscribe` patterns; `out` publishes topic messages to `--publish-to`; `both` bridges both ways)
- [ ] Implement Art-Net connector using an Art-Net/DMX library (`out` sends DMX universe data over UDP, `in` receives it; map channels to topic payloads)
- [ ] Implement Serial connector using a serial port library (open port, configure baud/framing; `in` reads framed messages to a topic, `out` writes topic messages to the port, `both` runs both on the same port)
- [ ] Add Makefile targets for build, lint, test, format
- [ ] Add a README with usage examples covering the direction convention

## Acceptance Criteria

- The universal `--direction <in|out|both>` flag works consistently across every connector, is defined relative to starfish (`in` = external → starfish, `out` = starfish → external), and defaults to `in`
- `--direction in` ingests external signals into the starfish topic; `--direction out` drives the external endpoint from the starfish topic; `--direction both` bridges both ways
- Requesting a direction a connector doesn't support fails with a clear error
- `starfish-bridge midi ... --direction both` publishes incoming MIDI to the topic and sends topic messages back to the device
- `starfish-bridge osc ... --direction in --in-port 9000` publishes incoming OSC to the topic; `--direction out --out-host ... --out-port ...` sends topic messages as OSC
- `starfish-bridge mqtt ... --direction in --subscribe "sensors/#"` bridges broker messages into the topic; `--direction out --publish-to ...` bridges topic messages back to the broker
- `starfish-bridge artnet ... --universe 0 --direction out` sends DMX to the universe; `--direction in` publishes received DMX to the topic
- `starfish-bridge serial ... --direction both` bridges framed messages both ways on the same port
- Common flags (--server, --session, --topic, --direction) work consistently across all connectors
- The CLI prints helpful errors when required args are missing or a device/port can't be opened
- Adding a new connector requires only implementing the `BridgeConnector` interface and registering it — no changes to core CLI logic
- The project builds, lints, and passes validation via Makefile targets

## Sub-tasks

- `01kxtrwnb` — Signal bridge core: project scaffold, BridgeConnector interface, CLI, and shared starfish connection
- `01kxtrwtf` — Signal bridge: MIDI connector
- `01kxtrwtg` — Signal bridge: OSC connector
- `01kxtrwyy` — Signal bridge: MQTT connector
- `01kxtrx3v` — Signal bridge: DMX/Art-Net connector
- `01kxtrxas` — Signal bridge: Serial connector
