---
title: "Update integration tests for new protocol envelope"
id: "01kxrcs2y"
status: pending
priority: high
type: feature
tags: ["tests", "breaking-change"]
created_at: "2026-07-17"
---

# Update integration tests for new protocol envelope

## Objective

Update all integration tests (`tests/`) to use the new protocol envelope and verify end-to-end behavior.

## Tasks

- [ ] Update connection tests for version negotiation handshake
- [ ] Update error tests for structured error format
- [ ] Update all frame assertions to expect `header`/`payload` structure
- [ ] Update raw WebSocket test frames to use new envelope
- [ ] Add test for version mismatch negotiation (client offers versions server doesn't support)
- [ ] Add test for `header.meta` extensibility
- [ ] Verify all existing test scenarios still pass

## Acceptance Criteria

- All integration tests pass with new envelope format
- Version negotiation is tested (happy path and mismatch)
- Structured errors are tested (including `retry` field)
- No references to old flat frame format in test assertions
