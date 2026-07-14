---
title: "Docker image for Starfish server (Go)"
id: "01kxgjazj"
status: completed
priority: medium
type: chore
tags: ["docker", "ci", "deployment"]
phase: "v0.1"
created_at: "2026-07-14"
completed_at: 2026-07-14
---

# Docker image for Starfish server (Go)

## Objective

Create a Docker image for the Go-based Starfish server (`servers/golang/`) and publish it to GitHub Container Registry (ghcr.io) as part of the release workflow.

## Tasks

- [x] Create a `Dockerfile` in `servers/golang/` with a multi-stage build (build stage using `golang:1.26-alpine`, runtime stage using `alpine` or `scratch`)
- [x] Add a `.dockerignore` file to exclude test files and unnecessary artifacts
- [x] Add a GitHub Actions workflow (or extend `release.yml`) to build and push the Docker image to `ghcr.io` on version tags
- [x] Tag images with the git tag version and `latest`
- [x] Verify the image runs correctly: listens on port 8080, accepts WebSocket connections at `/starfish`

## Acceptance Criteria

- A `Dockerfile` exists in `servers/golang/` that produces a minimal image for the Starfish server
- A GitHub Actions workflow builds and pushes the image to `ghcr.io/driangle/starfish-server` on `v*` tag pushes
- The image exposes port 8080 and starts the server by default
- The image size is kept small (multi-stage build, minimal base image)
