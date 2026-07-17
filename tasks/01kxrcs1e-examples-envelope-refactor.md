---
title: "Update examples for new protocol envelope"
id: "01kxrcs1e"
status: pending
priority: medium
type: feature
tags: ["examples", "breaking-change"]
created_at: "2026-07-17"
---

# Update examples for new protocol envelope

## Objective

Update all example projects (`examples/`) to use the new protocol envelope via the updated SDKs and adapters.

## Tasks

- [ ] Update p5.js examples for new envelope
- [ ] Update Three.js examples for new envelope
- [ ] Update TypeScript examples for new envelope
- [ ] Update Python examples for new envelope
- [ ] Verify all examples run correctly end-to-end

## Acceptance Criteria

- All examples compile/run without errors
- No references to old flat frame format in example code
- Examples demonstrate the new envelope structure where frames are constructed directly
