---
title: "Publish Go server to pkg.go.dev"
id: "01kxaf00d"
status: in-progress
priority: medium
type: chore
tags: ["publish", "server", "golang"]
phase: v0.1
created_at: "2026-07-12"
dependencies: [01kwyst5m, 01kxgg8s0]
---

# Publish Go server to pkg.go.dev

## Objective

Set up the Go server (`servers/golang`) for public distribution via pkg.go.dev so users can import it as a library or use it as a binary.

## Tasks

- [x] Ensure `go.mod` is properly configured with the correct module path
- [x] Add a LICENSE file if not present
- [x] Tag a release version (e.g. `servers/golang/v0.1.0`)
- [ ] Verify the module appears on pkg.go.dev after tagging (blocked: repo is currently private)
- [x] Add installation/usage instructions to the server README

## Acceptance Criteria

- The Go server module is importable via `go get`
- The module page is live on pkg.go.dev with correct documentation
