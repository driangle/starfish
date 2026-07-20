---
title: "Signal bridge: Serial connector"
id: "01kxtrxas"
status: pending
priority: medium
type: feature
tags: ["bridge", "serial"]
created_at: "2026-07-18"
---

# Signal bridge: Serial connector

## Objective

Implement the Serial `BridgeConnector` for the signal bridge CLI. Opens a serial port (USB/UART) and bridges framed messages with a starfish topic: `in` reads framed messages from the port to a topic, `out` writes topic messages to the port, `both` runs both on the same port. This covers Arduinos, custom microcontrollers, and any hardware that communicates over serial. See the core task (`01kxtrwnb`) for the shared `--direction` convention.

### CLI Usage

```bash
# in (default): port → topic
starfish-bridge serial --server ws://localhost:8080/starfish --session sensors --topic serial --port /dev/ttyUSB0 --baud 115200 --framing newline

# both: bidirectional on the same port
starfish-bridge serial --server ws://localhost:8080/starfish --session sensors --topic serial --port /dev/ttyUSB0 --baud 115200 --framing newline --direction both
```

## Tasks

- [ ] Implement Serial connector in `connectors/serial.ts` conforming to `BridgeConnector` interface, advertising support for `in`, `out`, and `both`
- [ ] Open configurable serial port (--port) with configurable baud rate (--baud, default 9600)
- [ ] Support multiple framing modes (--framing): newline (default), null-byte, length-prefixed, raw
- [ ] `in`: parse framed messages — attempt JSON parse, fall back to raw string payload — and publish to the topic
- [ ] `out`: subscribe to the starfish topic and write framed messages back to the serial port
- [ ] Add port listing (--list-ports flag to enumerate available serial devices)
- [ ] Handle port disconnection and reconnection (USB unplug/replug)
- [ ] Add tests with mocked serial port

## Acceptance Criteria

- Running `starfish-bridge serial ... --port /dev/ttyUSB0 --baud 115200 --framing newline` (default `--direction in`) opens the port and publishes each newline-delimited message to the topic
- JSON payloads from serial are parsed and forwarded as structured data; non-JSON payloads are wrapped as `{ raw: "..." }`
- Running with --list-ports enumerates available serial ports and exits
- Running with `--direction out` subscribes to the topic and writes framed messages back to the port; structured payloads are serialized with the configured framing before writing
- Running with `--direction both` reads and writes on the same port simultaneously
- The connector handles USB device disconnection gracefully and reconnects when the device reappears
