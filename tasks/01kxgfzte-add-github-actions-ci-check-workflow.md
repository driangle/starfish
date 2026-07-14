---
id: "01kxgfzte"
title: "Add GitHub Actions CI check workflow"
status: pending
priority: high
phase: v0.1
dependencies: []
tags: ["ci", "github-actions"]
created_at: 2026-07-14
---

# Add GitHub Actions CI check workflow

## Objective

Create a `.github/workflows/ci.yml` workflow that runs the project's existing `make check` target on every PR and push to dev/main. This ensures all lint, format-check, type-check, and unit tests pass before merging.

## Tasks

- [ ] Create `.github/workflows/ci.yml`
- [ ] Trigger on pull_request and push to dev/main branches
- [ ] Set up Node.js 20, Python 3.10+, Go 1.26, and Swift toolchain
- [ ] Run `make check` which covers all packages (TS SDK, TS server, Python SDK, Go server, Swift SDK, adapters, integration type-checks)
- [ ] Cache npm, pip, and Go module dependencies for faster runs

## Acceptance Criteria

- Workflow runs on PRs and pushes to dev/main
- All existing `make check` targets execute successfully
- Dependencies are cached for performance
- Workflow matrix or sequential steps cover all language toolchains needed
