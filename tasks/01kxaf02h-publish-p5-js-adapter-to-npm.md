---
title: "Publish p5.js adapter to npm"
id: "01kxaf02h"
status: completed
priority: medium
type: chore
tags: ["publish", "adapter", "p5js"]
phase: v0.1
created_at: "2026-07-12"
dependencies: [01kwyst6q, 01kxgg8s0]
completed_at: 2026-07-14
---

# Publish p5.js adapter to npm

## Objective

Publish the p5.js adapter (`adapters/p5js`) to npm so users can `npm install` it.

## Tasks

- [x] Verify `package.json` has correct name, version, description, and repository fields
- [x] Ensure build output is correct and entry points are configured
- [x] Add a LICENSE file if not present
- [x] Configure `.npmignore` or `files` field to exclude test/dev files
- [x] Publish to npm (`npm publish`)
- [x] Verify installation works via `npm install`
- [x] Add installation instructions to the adapter README

## Acceptance Criteria

- The package is installable via `npm install` from the npm registry
- The npm page shows correct metadata and version
