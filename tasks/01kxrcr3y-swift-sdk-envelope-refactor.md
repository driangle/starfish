---
title: "Refactor Swift SDK for new protocol envelope"
id: "01kxrcr3y"
status: pending
priority: medium
type: feature
tags: ["sdk", "swift", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor Swift SDK for new protocol envelope

## Objective

Update the Swift SDK (`sdks/swift/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [ ] Update frame model types — replace flat frame struct with `header`/`payload` split
- [ ] Replace `type` field with `method`/`resource`/`kind` enums
- [ ] Update Codable conformance for new envelope structure
- [ ] Update connection handshake to negotiate version
- [ ] Update error types to structured format with `retry` field
- [ ] Add `meta` dictionary support to header
- [ ] Update all frame encoding/decoding
- [ ] Update unit tests

## Acceptance Criteria

- All outgoing frames use `header`/`payload` structure
- Version negotiation occurs during handshake
- Errors use structured format
- All SDK tests pass with updated frame format
