---
title: "Update documentation for new protocol envelope"
id: "01kxrcs3y"
status: pending
priority: medium
type: feature
tags: ["docs", "breaking-change"]
created_at: "2026-07-17"
---

# Update documentation for new protocol envelope

## Objective

Update all documentation (`docs/`) to reflect the new protocol envelope structure, version negotiation, and error format.

## Tasks

- [ ] Update protocol overview/introduction docs
- [ ] Update all frame examples in documentation to use `header`/`payload` format
- [ ] Document version negotiation mechanism
- [ ] Document structured error format
- [ ] Document `header.meta` extensibility
- [ ] Document `kind` field semantics (request/response/event)
- [ ] Write migration guide from v1 to v2 envelope format
- [ ] Update any SDK-specific documentation

## Acceptance Criteria

- All documentation reflects the new envelope format
- No examples use the old flat frame structure
- Migration guide covers all message types
- Version negotiation is documented with examples
