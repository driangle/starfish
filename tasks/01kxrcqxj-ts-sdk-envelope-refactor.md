---
title: "Refactor TypeScript SDK for new protocol envelope"
id: "01kxrcqxj"
status: pending
priority: high
type: feature
tags: ["sdk", "typescript", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor TypeScript SDK for new protocol envelope

## Objective

Update the TypeScript SDK (`sdks/typescript/`) to use the new protocol envelope: `header`/`payload` split, `method`/`resource`/`kind` fields, version negotiation, and structured errors.

## Tasks

- [ ] Replace `StarfishFrame` type with new envelope type (`header` + `payload`)
- [ ] Replace `type` field usage with `method`/`resource`/`kind`
- [ ] Update `FrameOptions` — move delivery/priority/ttl into header
- [ ] Update connection handshake to send supported versions array and handle negotiation
- [ ] Update `StarfishError` to use structured error format with `retry` field
- [ ] Add `meta` support to header for extensible metadata
- [ ] Update all frame construction/parsing in `connection.ts`
- [ ] Update message routing logic that currently switches on `type` strings
- [ ] Update unit tests for new envelope format
- [ ] Ensure backward-incompatible changes are clearly documented in changelog

## Acceptance Criteria

- All outgoing frames use `header`/`payload` structure
- All incoming frames are parsed using the new envelope
- Version negotiation occurs during `client.hello`/`server.welcome`
- Errors are parsed into structured format with `retry` hint
- Existing SDK tests pass with updated frame format
- `StarfishFrame` type is removed in favor of new types
