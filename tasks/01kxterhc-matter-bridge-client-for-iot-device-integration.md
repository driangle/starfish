---
title: "Matter bridge client for IoT device integration"
id: "01kxterhc"
status: pending
priority: low
type: feature
tags: ["iot", "bridge", "matter"]
created_at: "2026-07-18"
---

# Matter bridge client for IoT device integration

## Objective

Build a Matter bridge client that joins a Starfish session and translates between Starfish messages (topics, direct messages) and Matter device commands. This enables installations and performances to control physical IoT devices (lights, sensors, actuators) through the Starfish protocol without embedding IoT-specific logic in application code.

Matter is chosen over a standalone Zigbee bridge because Matter already unifies Zigbee, Thread, Wi-Fi, and BLE device ecosystems under a single application-layer protocol, covering the broadest range of hardware with one integration.

## Tasks

- [ ] Research Matter SDK options (connectedhomeip, matter.js, chip-tool) and select one suitable for a bridge node
- [ ] Define a Starfish-to-Matter topic convention (e.g. `iot/{device-id}/command`, `iot/{device-id}/state`)
- [ ] Implement bridge client that connects to a Starfish session via the TypeScript or Python SDK
- [ ] Implement Matter controller that discovers and commissions local Matter devices
- [ ] Map inbound Starfish topic messages to Matter device cluster commands (on/off, level, color)
- [ ] Map Matter device state changes to outbound Starfish topic publishes
- [ ] Add configuration for device allowlists, topic prefixes, and session targeting
- [ ] Write integration tests with a simulated Matter device
- [ ] Document bridge setup, configuration, and supported device types

## Acceptance Criteria

- Bridge joins a Starfish session and appears as a normal client with presence
- Publishing to `iot/{device-id}/command` with a valid payload controls the corresponding Matter device
- Device state changes are published back to `iot/{device-id}/state` for other Starfish clients to observe
- Bridge reconnects gracefully after network interruption (leveraging Starfish resume tokens)
- At least on/off, brightness, and color temperature clusters are supported
- Works with any Matter-compatible device (including Zigbee devices behind a manufacturer's Matter bridge)
