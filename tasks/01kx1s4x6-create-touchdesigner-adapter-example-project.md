---
id: "01kx1s4x6"
title: "Create TouchDesigner adapter example project"
status: pending
priority: medium
dependencies: ["01kwyst7v"]
tags: ["adapter", "touchdesigner", "examples"]
created_at: 2026-07-08
phase: v0.2
---

# Create TouchDesigner adapter example project

## Objective

Create an example TouchDesigner project demonstrating how to use the Starfish TouchDesigner adapter for networked live visuals and installations. The example should showcase real-time multi-instance TD communication patterns.

## Tasks

- [ ] Set up example project in `examples/touchdesigner/` with a `.toe` file and supporting scripts
- [ ] Create a synchronized visuals example where multiple TD instances share parameters
- [ ] Create a sensor data streaming example using CHOP outputs for high-frequency numeric data
- [ ] Create a collaborative installation example using shared data for scene state
- [ ] Add presence visualization showing connected TD instances via DAT table
- [ ] Include parameter page configuration for server URL and session settings
- [ ] Add a README with setup instructions, TD version requirements, and example descriptions
- [ ] Ensure examples run against a local Starfish server

## Acceptance Criteria

- Examples open in TouchDesigner and connect to a local Starfish server
- Running multiple TD instances demonstrates real-time data sharing between them
- Each example includes comments in DAT scripts explaining the adapter API usage
- README provides clear setup and run instructions including TD version requirements
- Examples demonstrate presence (DAT tables), pub/sub (callbacks), and shared data through TD-idiomatic patterns
