---
title: "Refactor TypeScript server for new protocol envelope"
id: "01kxrcqy2"
status: pending
priority: high
type: feature
tags: ["server", "typescript", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor TypeScript server for new protocol envelope

## Objective

Update the TypeScript server (`servers/typescript/`) to parse, validate, route, and emit frames using the new protocol envelope.

## Tasks

- [ ] Update frame validation (`validateFrame`) to expect `header`/`payload` structure
- [ ] Replace `type`-based routing with `method`/`resource`/`kind`-based routing
- [ ] Implement version negotiation during handshake instead of per-frame validation
- [ ] Update error responses to structured format (`status`, `code`, `resource`, `retry`)
- [ ] Update all handler files to construct responses with new envelope
- [ ] Replace type rewriting logic (verb→noun) with `kind: "event"` for server-pushed frames
- [ ] Update unit tests and handler tests for new envelope
- [ ] Update error codes and constants

## Acceptance Criteria

- Server validates incoming frames against new envelope schema
- Routing uses `method` + `resource` instead of `type` string matching
- Version is negotiated once during handshake
- All server responses and events use the new envelope format
- Error responses include `retry` hint
- All server tests pass with updated format
