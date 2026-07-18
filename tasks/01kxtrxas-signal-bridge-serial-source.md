---
title: "Signal bridge: Serial source"
id: "01kxtrxas"
status: pending
priority: medium
type: feature
tags: ["bridge", "serial"]
created_at: "2026-07-18"
---

# Signal bridge: Serial source

## Objective

Implement the Serial `BridgeSource` for the signal bridge CLI. The source opens a serial port (USB/UART), reads framed messages, and bridges them bidirectionally with a starfish topic. This covers Arduinos, custom microcontrollers, and any hardware that communicates over serial.

### CLI Usage

```bash
starfish-bridge serial --server ws://localhost:8080/starfish --session sensors --topic serial-in --port /dev/ttyUSB0 --baud 115200 --framing newline
```

## Tasks

- [ ] Implement Serial source in `sources/serial.ts` conforming to `BridgeSource` interface
- [ ] Open configurable serial port (--port) with configurable baud rate (--baud, default 9600)
- [ ] Support multiple framing modes (--framing): newline (default), null-byte, length-prefixed, raw
- [ ] Parse framed messages — attempt JSON parse, fall back to raw string payload
- [ ] Support bidirectional mode: subscribe to starfish topic and write messages back to serial port
- [ ] Add port listing (--list-ports flag to enumerate available serial devices)
- [ ] Handle port disconnection and reconnection (USB unplug/replug)
- [ ] Add tests with mocked serial port

## Acceptance Criteria

- Running `starfish-bridge serial --server ... --session ... --topic ... --port /dev/ttyUSB0 --baud 115200 --framing newline` opens the serial port and publishes each newline-delimited message to the starfish topic
- JSON payloads from serial are parsed and forwarded as structured data; non-JSON payloads are wrapped as `{ raw: "..." }`
- Running with --list-ports enumerates available serial ports and exits
- The source handles USB device disconnection gracefully and reconnects when the device reappears
