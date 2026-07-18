---
title: "Refactor Python server for new protocol envelope"
id: "01kxrcr2y"
status: blocked
priority: high
type: feature
tags: ["server", "python", "breaking-change"]
dependencies: ["01kwyst53"]
created_at: "2026-07-17"
---

# Refactor Python server for new protocol envelope

## Blocked

The Python server (`servers/python/`) has not been implemented yet — the directory only contains a placeholder README. This task requires an existing server implementation to refactor. It should be unblocked once the Python server is built.

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
