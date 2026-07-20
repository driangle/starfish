---
title: "Signal bridge: OSC connector"
id: "01kxtrwtg"
status: pending
priority: medium
type: feature
tags: ["bridge", "osc"]
created_at: "2026-07-18"
---

# Signal bridge: OSC connector

## Objective

Implement the OSC `BridgeConnector` for the signal bridge CLI. Supports `in` (listen on a UDP port and forward incoming OSC to a starfish topic), `out` (send topic messages as OSC to a target host/port), and `both`. Because listening and sending need distinct config, `in` uses `--in-port` and `out` uses `--out-host`/`--out-port`. See the core task (`01kxtrwnb`) for the shared `--direction` convention.

### CLI Usage

```bash
# in (default): listen on UDP --in-port → topic
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc --direction in --in-port 9000

# out: topic → OSC at --out-host:--out-port
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc --direction out --out-host 127.0.0.1 --out-port 9000

# both: listen on --in-port and forward topic out to --out-host:--out-port
starfish-bridge osc --server ws://localhost:8080/starfish --session visuals --topic osc --direction both --in-port 9000 --out-host 127.0.0.1 --out-port 9001
```

## Tasks

- [ ] Implement OSC connector in `connectors/osc.ts` conforming to `BridgeConnector` interface, advertising support for `in`, `out`, and `both`
- [ ] `in`: listen on `--in-port` (UDP) and parse OSC messages into structured payloads (address, args with types), publishing to the topic
- [ ] `out`: subscribe to the starfish topic and serialize payloads back into OSC messages sent to `--out-host`/`--out-port`
- [ ] Handle OSC bundles (timetag + multiple messages) in both directions
- [ ] Add tests with mocked OSC input and output

## Acceptance Criteria

- Running `starfish-bridge osc ... --direction in --in-port 9000` listens for OSC on UDP port 9000 and publishes to the starfish topic
- OSC messages are published as structured JSON (e.g. `{ address: "/synth/freq", args: [440.0] }`)
- OSC bundles are unpacked into individual messages on the `in` path
- Running with `--direction out --out-host ... --out-port ...` subscribes to the topic and serializes payloads back into valid OSC messages sent to the target
- Running with `--direction both` listens and sends simultaneously
- The connector cleans up the UDP socket(s) on shutdown
