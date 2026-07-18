---
title: "Refactor Python SDK for new protocol envelope"
id: "01kxrcr25"
status: completed
priority: high
type: feature
tags: ["sdk", "python", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Refactor Python SDK for new protocol envelope

## Objective

Update the Python SDK (`sdks/python/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [x] Update `types.py` — replace `StarfishFrame` with new envelope types
- [x] Replace `type` field usage with `method`/`resource`/`kind`
- [x] Update connection handshake to negotiate version
- [x] Update error types to structured format with `retry` field
- [x] Add `meta` dict support to header
- [x] Update all frame construction/parsing in connection module
- [x] Update unit tests

## Acceptance Criteria

- All outgoing frames use `header`/`payload` structure
- Version negotiation occurs during handshake
- Errors are parsed into structured format
- All SDK tests pass with updated frame format
