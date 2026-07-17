---
title: "Refactor Python server for new protocol envelope"
id: "01kxrcr2y"
status: pending
priority: high
type: feature
tags: ["server", "python", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor Python server for new protocol envelope

## Objective

Update the Python server (`servers/python/`) to parse, validate, route, and emit frames using the new protocol envelope.

## Tasks

- [ ] Update frame validation to expect `header`/`payload` structure
- [ ] Replace `type`-based routing with `method`/`resource`/`kind`-based routing
- [ ] Implement version negotiation during handshake
- [ ] Update error responses to structured format
- [ ] Update all handler functions to construct responses with new envelope
- [ ] Replace type rewriting with `kind: "event"` for server-pushed frames
- [ ] Update unit tests

## Acceptance Criteria

- Server validates incoming frames against new envelope schema
- Routing uses `method` + `resource` instead of `type` string matching
- Version is negotiated once during handshake
- All server responses and events use the new envelope format
- All server tests pass
