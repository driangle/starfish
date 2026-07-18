---
title: "Refactor Swift SDK for new protocol envelope"
id: "01kxrcr3y"
status: completed
priority: medium
type: feature
tags: ["sdk", "swift", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Refactor Swift SDK for new protocol envelope

## Objective

Update the Swift SDK (`sdks/swift/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [x] Update frame model types — replace flat frame struct with `header`/`payload` split
- [x] Replace `type` field with `method`/`resource`/`kind` enums
- [x] Update Codable conformance for new envelope structure
- [x] Update connection handshake to negotiate version
- [x] Update error types to structured format with `retry` field
- [x] Add `meta` dictionary support to header
- [x] Update all frame encoding/decoding
- [x] Update unit tests

## Acceptance Criteria

- All outgoing frames use `header`/`payload` structure
- Version negotiation occurs during handshake
- Errors use structured format
- All SDK tests pass with updated frame format
