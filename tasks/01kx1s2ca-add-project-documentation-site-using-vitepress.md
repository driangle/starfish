---
id: "01kx1s2ca"
title: "Add project documentation site using VitePress"
status: completed
priority: medium
dependencies: []
tags: ["docs", "vitepress"]
created_at: 2026-07-08
phase: v0.1
completed_at: 2026-07-14
---

# Add project documentation site using VitePress

## Objective

Set up a VitePress-powered documentation site for the Starfish project with skeleton structure, theming, navigation, and GitHub Pages deployment. Content tasks (user guide, cookbook) will populate the site after this scaffolding is in place.

## Tasks

- [x] Initialize VitePress project in `docs/` with config, theme, and navigation structure
- [x] Add a landing page with project overview and quick links
- [x] Create placeholder directory structure for content sections: `docs/guide/`, `docs/cookbook/`, `docs/reference/`, `docs/adapters/`
- [x] Configure sidebar navigation grouping docs by category
- [x] Add search functionality
- [x] Add build scripts and npm commands for dev/build/preview
- [x] Set up GitHub Actions workflow to deploy the site to GitHub Pages on push to main
- [x] Ensure the site builds without errors and can be deployed as static files

## Acceptance Criteria

- `npm run docs:dev` starts a local VitePress dev server
- `npm run docs:build` produces a static site in `docs/.vitepress/dist/`
- GitHub Actions workflow deploys the built site to GitHub Pages
- Sidebar navigation structure is configured for guide, cookbook, reference, and adapter sections
- Navigation is organized and searchable
- Site renders correctly in modern browsers
