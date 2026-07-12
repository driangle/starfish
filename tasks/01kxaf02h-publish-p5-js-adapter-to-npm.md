---
title: "Publish p5.js adapter to npm"
id: "01kxaf02h"
status: pending
priority: medium
type: chore
tags: ["publish", "adapter", "p5js"]
created_at: "2026-07-12"
---

# Publish p5.js adapter to npm

## Objective

Publish the p5.js adapter (`adapters/p5js`) to npm so users can `npm install` it.

## Tasks

- [ ] Verify `package.json` has correct name, version, description, and repository fields
- [ ] Ensure build output is correct and entry points are configured
- [ ] Add a LICENSE file if not present
- [ ] Configure `.npmignore` or `files` field to exclude test/dev files
- [ ] Publish to npm (`npm publish`)
- [ ] Verify installation works via `npm install`
- [ ] Add installation instructions to the adapter README

## Acceptance Criteria

- The package is installable via `npm install` from the npm registry
- The npm page shows correct metadata and version
