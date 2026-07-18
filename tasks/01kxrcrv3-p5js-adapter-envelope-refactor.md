---
title: "Refactor p5.js adapter for new protocol envelope"
id: "01kxrcrv3"
status: completed
priority: high
type: feature
tags: ["adapter", "p5js", "breaking-change"]
created_at: "2026-07-17"
completed_at: 2026-07-18
---

# Refactor p5.js adapter for new protocol envelope

## Objective

Update the p5.js adapter (`adapters/p5js/`) to work with the new protocol envelope from the TypeScript SDK.

## Tasks

- [x] Update any direct frame construction to use `header`/`payload` structure
- [x] Update any frame inspection/parsing that references `type` to use `method`/`resource`/`kind`
- [x] Update any error handling to use structured error format
- [x] Update adapter tests
- [x] Verify adapter works end-to-end with updated SDK

## Acceptance Criteria

- Adapter works correctly with the updated TypeScript SDK
- No references to old flat frame format remain
- Adapter tests pass
