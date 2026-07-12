---
title: "Publish TouchDesigner adapter to relevant registry"
id: "01kxaf040"
status: pending
priority: medium
type: chore
tags: ["publish", "adapter", "touchdesigner"]
created_at: "2026-07-12"
---

# Publish TouchDesigner adapter to relevant registry

## Objective

Publish the TouchDesigner adapter (`adapters/touchdesigner`) to the appropriate distribution channel. TouchDesigner plugins are typically distributed as `.tox` files or via GitHub releases rather than a package registry.

## Tasks

- [ ] Determine the best distribution method (GitHub Releases, TouchDesigner community forum, or similar)
- [ ] Package the adapter in the appropriate format (`.tox` or archive)
- [ ] Add a LICENSE file if not present
- [ ] Create a GitHub Release with the packaged adapter
- [ ] Add installation/usage instructions to the adapter README

## Acceptance Criteria

- The adapter is publicly downloadable from the chosen distribution channel
- Installation instructions are documented in the README
