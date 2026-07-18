---
title: "Refactor Go SDK for new protocol envelope"
id: "01kxrcr4s"
status: completed
priority: medium
type: feature
tags: ["sdk", "golang", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Refactor Go SDK for new protocol envelope

## Objective

Update the Go SDK (`sdks/golang/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [x] Update frame struct — replace flat struct with `Header`/`Payload` split
- [x] Replace `Type` field with `Method`/`Resource`/`Kind`
- [x] Update JSON marshaling/unmarshaling for new envelope
- [x] Update connection handshake to negotiate version
- [x] Update error types to structured format with `Retry` field
- [x] Add `Meta` map support to header
- [x] Update unit tests

## Acceptance Criteria

- All outgoing frames use `Header`/`Payload` structure
- Version negotiation occurs during handshake
- Errors use structured format
- All SDK tests pass with updated frame format
