---
id: "01kxgg8s0"
title: "Add GitHub Actions release workflow for publishing packages"
status: pending
priority: high
phase: v0.1
dependencies: ["01kxgfzte"]
tags: ["ci", "github-actions", "release"]
created_at: 2026-07-14
---

# Add GitHub Actions release workflow for publishing packages

## Objective

Create a `.github/workflows/release.yml` workflow triggered by `v*` tags that builds and publishes all v0.1 packages to their respective registries, and creates a GitHub Release. This integrates with the `/release` skill's `release.sh` script which pushes a tag and then monitors this workflow.

Also create a `.release.conf` file listing all version files in the monorepo so the release script bumps them all in lockstep.

## Context

The monorepo has these publishable packages for v0.1:
- `@starfish/client` (npm) — `sdks/typescript/package.json`
- `@starfish/server` (npm) — `servers/typescript/package.json`
- `@starfish/p5` (npm) — `adapters/p5js/package.json`
- `@starfish/three` (npm) — `adapters/threejs/package.json`
- `starfish-client` (PyPI) — `sdks/python/pyproject.toml`
- Go server (pkg.go.dev) — tagged via git, no build/upload step needed

## Tasks

- [ ] Create `.release.conf` listing all version files for the release script
- [ ] Create `.github/workflows/release.yml` triggered on `v*` tag pushes
- [ ] Add job to build and publish npm packages (`@starfish/client`, `@starfish/server`, `@starfish/p5`, `@starfish/three`) using `NPM_TOKEN` secret
- [ ] Add job to build and publish Python SDK to PyPI using trusted publishing or `PYPI_TOKEN` secret
- [ ] Add job to create a GitHub Release with the tag
- [ ] Ensure each publish job runs `make check` or equivalent build/test step before publishing

## Acceptance Criteria

- Pushing a `v*` tag triggers the release workflow
- All 4 npm packages are built and published to npm
- Python SDK is built and published to PyPI
- A GitHub Release is created for the tag
- The workflow is compatible with the `/release` skill (release.sh monitors `release.yml`)
- Each package is built and tested before publishing
