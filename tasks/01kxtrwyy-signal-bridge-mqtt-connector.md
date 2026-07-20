---
title: "Signal bridge: MQTT connector"
id: "01kxtrwyy"
status: pending
priority: medium
type: feature
tags: ["bridge", "mqtt"]
created_at: "2026-07-18"
---

# Signal bridge: MQTT connector

## Objective

Implement the MQTT `BridgeConnector` for the signal bridge CLI. Connects to an MQTT broker and bridges with a starfish topic: `in` subscribes to broker topic patterns (`--subscribe`) and forwards to starfish; `out` subscribes to the starfish topic and publishes to a broker topic (`--publish-to`); `both` does both. See the core task (`01kxtrwnb`) for the shared direction convention.

### CLI Usage

```bash
# in: broker --subscribe patterns → starfish topic
starfish-bridge mqtt in   --server ws://localhost:8080/starfish --session install --topic iot --broker mqtt://localhost:1883 --subscribe "sensors/#"

# out: starfish topic → broker --publish-to topic
starfish-bridge mqtt out  --server ws://localhost:8080/starfish --session install --topic iot --broker mqtt://localhost:1883 --publish-to "commands/lights"

# both
starfish-bridge mqtt both --server ws://localhost:8080/starfish --session install --topic iot --broker mqtt://localhost:1883 --subscribe "sensors/#" --publish-to "commands/lights"
```

## Tasks

- [ ] Implement MQTT connector in `connectors/mqtt.ts` conforming to `BridgeConnector` interface, advertising support for `in`, `out`, and `both`
- [ ] Connect to configurable MQTT broker (--broker flag, support mqtt:// and mqtts://)
- [ ] `in`: subscribe to one or more MQTT topic patterns (--subscribe, supports wildcards) and forward to the starfish topic with metadata (original MQTT topic, QoS, retain flag)
- [ ] `out`: subscribe to the starfish topic and publish messages to the MQTT broker (--publish-to)
- [ ] Handle MQTT reconnection and clean session options
- [ ] Add tests with mocked MQTT broker

## Acceptance Criteria

- Running `starfish-bridge mqtt in ... --subscribe "sensors/#"` subscribes to MQTT topics and publishes matching messages to the starfish topic
- MQTT messages include the original MQTT topic in the payload (e.g. `{ mqttTopic: "sensors/temp/1", payload: ... }`)
- Running `starfish-bridge mqtt out ... --publish-to ...` subscribes to the starfish topic and publishes those messages to the broker
- Running `starfish-bridge mqtt both ...` bridges in both directions simultaneously
- The connector reconnects to the MQTT broker after connection drops
