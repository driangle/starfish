---
title: "Publish TypeScript server to npm"
id: "01kxaf01p"
status: completed
priority: medium
type: chore
tags: ["publish", "server", "typescript"]
phase: v0.1
created_at: "2026-07-12"
dependencies: [01kwyst4k, 01kxgg8s0]
completed_at: 2026-07-14
---

# Publish TypeScript server to npm

## Objective

Publish the TypeScript server (`servers/typescript`) to npm so users can install and run it.

## Tasks

- [x] Verify `package.json` has correct name, version, description, repository, and bin fields
- [x] Ensure build output is correct and entry points are configured
- [x] Add a LICENSE file if not present
- [x] Configure `.npmignore` or `files` field to exclude test/dev files
- [x] Publish to npm (`npm publish`)
- [x] Verify installation and startup works via `npm install`
- [x] Add installation/usage instructions to the server README

## Acceptance Criteria

- The package is installable via `npm install` from the npm registry
- The server can be started after installation
- The npm page shows correct metadata and version
