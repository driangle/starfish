---
title: "Refactor Go SDK for new protocol envelope"
id: "01kxrcr4s"
status: pending
priority: medium
type: feature
tags: ["sdk", "golang", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor Go SDK for new protocol envelope

## Objective

Update the Go SDK (`sdks/golang/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [ ] Update frame struct — replace flat struct with `Header`/`Payload` split
- [ ] Replace `Type` field with `Method`/`Resource`/`Kind`
- [ ] Update JSON marshaling/unmarshaling for new envelope
- [ ] Update connection handshake to negotiate version
- [ ] Update error types to structured format with `Retry` field
- [ ] Add `Meta` map support to header
- [ ] Update unit tests

## Acceptance Criteria

- All outgoing frames use `Header`/`Payload` structure
- Version negotiation occurs during handshake
- Errors use structured format
- All SDK tests pass with updated frame format
