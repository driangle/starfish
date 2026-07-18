---
title: "Update documentation for new protocol envelope"
id: "01kxrcs3y"
status: completed
priority: medium
type: feature
tags: ["docs", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Update documentation for new protocol envelope

## Objective

Update all documentation (`docs/`) to reflect the new protocol envelope structure, version negotiation, and error format.

## Tasks

- [x] Update protocol overview/introduction docs
- [x] Update all frame examples in documentation to use `header`/`payload` format
- [x] Document version negotiation mechanism
- [x] Document structured error format
- [x] Document `header.meta` extensibility
- [x] Document `kind` field semantics (request/response/event)
- [x] Write migration guide from v1 to v2 envelope format
- [x] Update any SDK-specific documentation

## Acceptance Criteria

- All documentation reflects the new envelope format
- No examples use the old flat frame structure
- Migration guide covers all message types
- Version negotiation is documented with examples
