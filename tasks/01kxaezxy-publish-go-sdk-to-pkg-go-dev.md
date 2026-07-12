---
title: "Publish Go SDK to pkg.go.dev"
id: "01kxaezxy"
status: pending
priority: medium
type: chore
tags: ["publish", "sdk", "golang"]
created_at: "2026-07-12"
---

# Publish Go SDK to pkg.go.dev

## Objective

Set up the Go SDK (`sdks/golang`) for public distribution via pkg.go.dev so users can `go get` it.

## Tasks

- [ ] Ensure `go.mod` is properly configured with the correct module path
- [ ] Add a LICENSE file if not present
- [ ] Tag a release version (e.g. `sdks/golang/v0.1.0`)
- [ ] Verify the module appears on pkg.go.dev after tagging
- [ ] Add installation instructions to the SDK README

## Acceptance Criteria

- The Go SDK is importable via `go get`
- The module page is live on pkg.go.dev with correct documentation
