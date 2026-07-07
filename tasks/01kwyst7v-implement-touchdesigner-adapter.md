---
title: "Implement TouchDesigner Adapter"
id: "01kwyst7v"
status: pending
priority: medium
type: feature
tags: ["adapter", "touchdesigner", "python"]
created_at: "2026-07-07"
dependencies: ["01kwyst2r"]
---

# Implement TouchDesigner Adapter

## Objective

Implement the TouchDesigner adapter for Starfish, built on the Python SDK. This adapter provides a DAT operator for TouchDesigner so artists can integrate Starfish into TD networks for live visuals, installations, and performances. Located in `adapters/touchdesigner/`.

## Tasks

- [ ] Set up project structure for TouchDesigner DAT integration
- [ ] Design TD-idiomatic API using DAT callbacks and CHOP/DAT patterns
- [ ] Implement StarfishDAT operator wrapping the Python SDK `StarfishClient`
- [ ] Provide connection management tied to TD component lifecycle
- [ ] Expose presence as DAT table rows (peer data readable by other operators)
- [ ] Expose topic pub/sub through TD callbacks and DAT outputs
- [ ] Provide shared data as readable/writable DAT tables
- [ ] Implement CHOP output for high-frequency numeric streams (sensor data, positions)
- [ ] Support parameter pages for server URL, session name, client config
- [ ] Add example TD project demonstrating common patterns
- [ ] Write tests for adapter logic (outside TD environment)

## Acceptance Criteria

- Adapter wraps Python SDK without re-implementing protocol logic
- DAT operator connects/disconnects with TD component lifecycle
- Presence data available as DAT table for downstream operators
- Topic messages trigger callbacks and/or populate DAT outputs
- Shared data readable as DAT tables
- Parameter pages allow configuration without code
- Example project demonstrates multi-instance TD communication
- Clean teardown when component is deleted/disabled
