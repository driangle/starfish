---
id: "01kx1s2ca"
title: "Add project documentation site using VitePress"
status: pending
priority: medium
dependencies: []
tags: ["docs", "vitepress"]
created_at: 2026-07-08
---

# Add project documentation site using VitePress

## Objective

Set up a VitePress-powered documentation site for the Starfish project covering the protocol specification, SDK references, server guides, adapter usage, and getting started tutorials.

## Tasks

- [ ] Initialize VitePress project in `docs/` with config, theme, and navigation structure
- [ ] Add a landing page with project overview and quick links
- [ ] Add a "Getting Started" guide covering installation, server setup, and first connection
- [ ] Add protocol specification pages (converted/linked from `protocol/spec/`)
- [ ] Add SDK reference pages for TypeScript, Python, and Go SDKs
- [ ] Add server deployment and configuration guides
- [ ] Add adapter guides for p5.js, Three.js, and TouchDesigner
- [ ] Configure sidebar navigation grouping docs by category
- [ ] Add search functionality
- [ ] Add a build script and npm commands for dev/build/preview
- [ ] Ensure the site builds without errors and can be deployed as static files

## Acceptance Criteria

- `npm run docs:dev` starts a local VitePress dev server
- `npm run docs:build` produces a static site in `docs/.vitepress/dist/`
- Documentation covers all major project areas: protocol, SDKs, servers, adapters
- Navigation is organized and searchable
- Site renders correctly in modern browsers
