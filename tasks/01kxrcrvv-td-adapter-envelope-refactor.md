---
title: "Refactor TouchDesigner adapter for new protocol envelope"
id: "01kxrcrvv"
status: cancelled
priority: medium
type: feature
tags: ["adapter", "touchdesigner", "breaking-change"]
created_at: "2026-07-17"
cancelled_at: 2026-07-18
---

# Refactor TouchDesigner adapter for new protocol envelope

## Objective

Update the TouchDesigner adapter (`adapters/touchdesigner/`) to work with the new protocol envelope from the Python SDK.

## Tasks

- [ ] Update any direct frame construction to use `header`/`payload` structure
- [ ] Update any frame inspection/parsing that references `type` to use `method`/`resource`/`kind`
- [ ] Update any error handling to use structured error format
- [ ] Update adapter tests
- [ ] Verify adapter works end-to-end with updated Python SDK

## Acceptance Criteria

- Adapter works correctly with the updated Python SDK
- No references to old flat frame format remain
- Adapter tests pass
