---
title: "Signal bridge: DMX/Art-Net connector"
id: "01kxtrx3v"
status: pending
priority: medium
type: feature
tags: ["bridge", "dmx"]
created_at: "2026-07-18"
---

# Signal bridge: DMX/Art-Net connector

## Objective

Implement the DMX/Art-Net `BridgeConnector` for the signal bridge CLI. Sends and receives DMX512 universe data over Art-Net (UDP), bridging channel values between starfish topics and physical lighting fixtures. `out` drives fixtures from a topic; `in` reads a lighting console into a topic; `both` does both on the same universe. See the core task (`01kxtrwnb`) for the shared `--direction` convention.

### CLI Usage

```bash
# out: starfish topic → Art-Net universe (control lights from starfish)
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx --universe 0 --direction out

# in: Art-Net universe → starfish topic (read from a lighting console)
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx --universe 0 --direction in
```

## Tasks

- [ ] Implement Art-Net connector in `connectors/artnet.ts` conforming to `BridgeConnector` interface, advertising support for `in`, `out`, and `both`
- [ ] `out`: subscribe to starfish topic and send DMX channel data as Art-Net ArtDmx packets
- [ ] `in`: listen for Art-Net ArtDmx packets and publish channel data to starfish topic
- [ ] Configure universe number (--universe), network interface (--interface), and target node (--node for unicast)
- [ ] Define channel payload format (e.g. `{ universe: 0, channels: [255, 128, 0, ...] }` or sparse `{ universe: 0, updates: { "1": 255, "5": 128 } }`)
- [ ] Support ArtPoll for node discovery (--discover flag)
- [ ] Add tests with mocked Art-Net UDP packets

## Acceptance Criteria

- Running with `--direction out` subscribes to a starfish topic and sends DMX channel data to the specified Art-Net universe
- Running with `--direction in` listens for Art-Net packets on the specified universe and publishes channel values to the starfish topic
- Running with `--direction both` bridges the universe in both directions simultaneously
- Channel data is sent at an appropriate refresh rate (max 44Hz per DMX spec)
- The connector handles universe addressing correctly (0–32767)
