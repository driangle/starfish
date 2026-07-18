---
title: "Refactor Go server for new protocol envelope"
id: "01kxrcr59"
status: completed
priority: medium
type: feature
tags: ["server", "golang", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Refactor Go server for new protocol envelope

## Objective

Update the Go server (`servers/golang/`) to parse, validate, route, and emit frames using the new protocol envelope.

## Tasks

- [x] Update frame validation to expect `Header`/`Payload` structure
- [x] Replace `Type`-based routing with `Method`/`Resource`/`Kind`-based routing
- [x] Implement version negotiation during handshake
- [x] Update error responses to structured format
- [x] Update all handler functions for new envelope
- [x] Replace type rewriting with `Kind: "event"` for server-pushed frames
- [x] Update unit tests

## Acceptance Criteria

- Server validates incoming frames against new envelope schema
- Routing uses `Method` + `Resource` instead of `Type` string matching
- Version is negotiated once during handshake
- All server responses and events use the new envelope format
- All server tests pass
