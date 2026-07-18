---
title: "Signal bridge: MQTT source"
id: "01kxtrwyy"
status: pending
priority: medium
type: feature
tags: ["bridge", "mqtt"]
created_at: "2026-07-18"
---

# Signal bridge: MQTT source

## Objective

Implement the MQTT `BridgeSource` for the signal bridge CLI. The source connects to an MQTT broker, subscribes to configurable topic patterns, and forwards messages bidirectionally between MQTT and a starfish topic.

### CLI Usage

```bash
starfish-bridge mqtt --server ws://localhost:8080/starfish --session install --topic iot-in --broker mqtt://localhost:1883 --subscribe "sensors/#"
```

## Tasks

- [ ] Implement MQTT source in `sources/mqtt.ts` conforming to `BridgeSource` interface
- [ ] Connect to configurable MQTT broker (--broker flag, support mqtt:// and mqtts://)
- [ ] Subscribe to one or more MQTT topic patterns (--subscribe flag, supports wildcards)
- [ ] Forward incoming MQTT messages to starfish topic with metadata (original MQTT topic, QoS, retain flag)
- [ ] Support bidirectional mode: subscribe to starfish topic and publish back to MQTT (--publish-to flag)
- [ ] Handle MQTT reconnection and clean session options
- [ ] Add tests with mocked MQTT broker

## Acceptance Criteria

- Running `starfish-bridge mqtt --server ... --session ... --topic ... --broker mqtt://... --subscribe "sensors/#"` subscribes to MQTT topics and publishes matching messages to the starfish topic
- MQTT messages include the original MQTT topic in the payload (e.g. `{ mqttTopic: "sensors/temp/1", payload: ... }`)
- Bidirectional mode forwards starfish messages back to MQTT when --publish-to is specified
- The source reconnects to the MQTT broker after connection drops
