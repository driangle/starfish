---
title: "Build starfishClient TOX Component"
id: "01kwyst7v"
status: pending
priority: medium
type: feature
tags: ["adapter", "touchdesigner", "python", "tox"]
created_at: "2026-07-07"
dependencies: ["01kwyst2r"]
phase: v0.3
---

# Build starfishClient TOX Component

## Objective

Build a reusable `.tox` component (`starfishClient`) for TouchDesigner that wraps the existing Starfish Python SDK (`StarfishClient`) rather than reimplementing the protocol. The TOX is the primary integration point for artists using Starfish in TD networks for live visuals, installations, and performances. Located in `adapters/touchdesigner/`.

## Tasks

### Custom Parameters

- [ ] Create `starfishClient` COMP with custom parameter pages
- [ ] **Connection page**: server URL, auto-connect toggle
- [ ] **Session page**: session name, join-on-connect toggle
- [ ] **Identity page**: client name, role, metadata (JSON string)
- [ ] **Auth page**: auth type menu (none/token), token string
- [ ] **WebRTC page**: prefer-transport menu (ws/rtc/auto), fallback toggle
- [ ] **Reconnect page**: enabled toggle, max retries, base delay, max delay

### SDK Integration & Async Bridge

- [ ] Initialize `StarfishClient` from custom parameter values
- [ ] Run SDK async event loop on a background thread (must not block TD cook)
- [ ] Implement thread-safe update queue: SDK callbacks enqueue updates, TD cook thread applies them
- [ ] Bind COMP lifecycle (create/destroy/enable/disable) to SDK connect/disconnect
- [ ] Re-initialize client when connection parameters change

### DAT Outputs

- [ ] **Messages DAT**: table output for incoming topic messages and direct messages (columns: timestamp, type, from, topic, payload)
- [ ] **Presence DAT**: table output for current peer presence data (columns: client_id, name, role, payload)
- [ ] **Events DAT**: table output for connection/session/error events (columns: timestamp, type, details)
- [ ] **State DAT**: single-row table showing connection state, session name, client ID, error info
- [ ] Ring-buffer or max-row limit on Messages/Events DATs to prevent unbounded growth

### CHOP Outputs

- [ ] **Connection CHOP**: channels for connection state (connected, reconnecting, etc.), latency
- [ ] **Presence Count CHOP**: channel for current peer count

### Topic Subscribe/Publish

- [ ] Subscribe to topics via custom parameter (comma-separated) or Python API
- [ ] Auto-resubscribe to topics on reconnect
- [ ] Publish to a topic from Python API (`op('starfishClient').Publish(topic, payload)`)
- [ ] Route topic messages to Messages DAT output

### Direct Messaging & Broadcast

- [ ] Send direct message to one or more clients via Python API
- [ ] Broadcast to all peers via Python API
- [ ] Route incoming direct/broadcast messages to Messages DAT output

### Shared Data Operations

- [ ] Save/get shared data via Python API
- [ ] Surface data change events in Events DAT

### Presence

- [ ] Set local presence via Python API or custom parameter (JSON string)
- [ ] Reflect all peer presence in Presence DAT
- [ ] Update Presence DAT on peer join/leave/change

### Reconnection

- [ ] Automatic reconnect using SDK `ReconnectOptions` (driven by custom parameters)
- [ ] Auto-rejoin session and resubscribe to topics after reconnect
- [ ] Surface reconnection events in Events DAT and Connection CHOP

### Promoted Python API

- [ ] Expose promoted methods on the COMP extension:
  - `Connect()`, `Disconnect()`
  - `Join(session, options=None)`, `Leave()`
  - `Subscribe(topic)`, `Unsubscribe(topic)`, `Publish(topic, payload, options=None)`
  - `Send(to, payload, options=None)`, `Broadcast(payload, include_self=False, options=None)`
  - `PresenceSet(payload)`
  - `Save(options)`, `Get(key, scope='session')`
- [ ] Expose read-only promoted properties: `ConnectionState`, `ClientId`, `SessionName`, `Peers`

### Helper Components

- [ ] **topicToChop**: child COMP that converts a JSON topic stream into CHOP channels (configurable key mapping)
- [ ] **chopPublisher**: child COMP that publishes CHOP channel values to a topic at a configurable, rate-limited frequency

### Protocol Envelope Compliance

- [ ] Ensure any frame construction uses `header`/`payload` envelope structure (not flat format)
- [ ] Ensure any frame inspection/parsing references `method`/`resource`/`kind` (not legacy `type` field)
- [ ] Use structured error format for error handling
- [ ] Verify adapter works end-to-end with the envelope-based Python SDK

### Testing & Examples

- [ ] Write unit tests for the async bridge / update queue logic (outside TD)
- [ ] Write unit tests for DAT/CHOP output formatting logic
- [ ] Add example `.toe` project demonstrating: connect, subscribe, publish, presence, multi-instance communication

## Acceptance Criteria

- Component is a single `.tox` file that can be dropped into any TD project
- All protocol communication goes through the Python SDK — no direct WebSocket or frame handling
- Custom parameters allow full configuration without writing any Python
- Network I/O runs on a background thread; TD cook thread never blocks on SDK calls
- SDK callbacks enqueue updates that are applied safely during TD execution
- Messages, presence, events, connection state, and errors are surfaced through DAT and CHOP outputs
- Topics auto-resubscribe and session auto-rejoins after reconnect
- Promoted Python API provides full SDK functionality for advanced users
- `topicToChop` helper converts JSON topic data to CHOP channels
- `chopPublisher` helper publishes CHOP values at a rate-limited frequency
- WebRTC transport preference is configurable but transport details are hidden from most users
- Clean teardown when component is deleted or disabled (background thread stops, connection closes)
- Example project demonstrates common patterns with multiple TD instances
