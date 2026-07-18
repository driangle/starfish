---
title: "Signal bridge: DMX/Art-Net source"
id: "01kxtrx3v"
status: pending
priority: medium
type: feature
tags: ["bridge", "dmx"]
created_at: "2026-07-18"
---

# Signal bridge: DMX/Art-Net source

## Objective

Implement the DMX/Art-Net `BridgeSource` for the signal bridge CLI. The source sends and receives DMX512 universe data over Art-Net (UDP), bridging channel values between starfish topics and physical lighting fixtures.

### CLI Usage

```bash
# Output: starfish topic → Art-Net universe (control lights from starfish)
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx-out --universe 0 --direction out

# Input: Art-Net universe → starfish topic (read from a lighting console)
starfish-bridge artnet --server ws://localhost:8080/starfish --session show --topic dmx-in --universe 0 --direction in
```

## Tasks

- [ ] Implement Art-Net source in `sources/artnet.ts` conforming to `BridgeSource` interface
- [ ] Support output direction: subscribe to starfish topic and send DMX channel data as Art-Net ArtDmx packets
- [ ] Support input direction: listen for Art-Net ArtDmx packets and publish channel data to starfish topic
- [ ] Configure universe number (--universe), network interface (--interface), and target node (--node for unicast)
- [ ] Define channel payload format (e.g. `{ universe: 0, channels: [255, 128, 0, ...] }` or sparse `{ universe: 0, updates: { "1": 255, "5": 128 } }`)
- [ ] Support ArtPoll for node discovery (--discover flag)
- [ ] Add tests with mocked Art-Net UDP packets

## Acceptance Criteria

- Running with `--direction out` subscribes to a starfish topic and sends DMX channel data to the specified Art-Net universe
- Running with `--direction in` listens for Art-Net packets on the specified universe and publishes channel values to the starfish topic
- Channel data is sent at an appropriate refresh rate (max 44Hz per DMX spec)
- The source handles universe addressing correctly (0–32767)
