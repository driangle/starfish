---
title: "Publish TypeScript SDK to npm"
id: "01kxaezzb"
status: completed
priority: medium
type: chore
tags: ["publish", "sdk", "typescript"]
phase: v0.1
created_at: "2026-07-12"
dependencies: [01kwyst27, 01kxgg8s0]
completed_at: 2026-07-14
---

# Publish TypeScript SDK to npm

## Objective

Publish the TypeScript SDK (`sdks/typescript`) to npm so users can `npm install` it.

## Tasks

- [x] Verify `package.json` has correct name, version, description, and repository fields
- [x] Ensure build output (`dist/`) is correct and `main`/`types` fields point to the right files
- [x] Add a LICENSE file if not present
- [x] Configure `.npmignore` or `files` field to exclude test/dev files from the package
- [x] Publish to npm (`npm publish`)
- [x] Verify installation works via `npm install`
- [x] Add installation instructions to the SDK README

## Acceptance Criteria

- The package is installable via `npm install` from the npm registry
- The npm page shows correct metadata and version
