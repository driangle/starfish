---
title: "Docker image for Starfish bridge"
id: "01kxgjd4y"
status: pending
priority: low
type: chore
tags: ["docker", "ci", "deployment", "bridge"]
dependencies: ["01kxfmdyt"]
phase: "v0.3"
created_at: "2026-07-14"
---

# Docker image for Starfish bridge

## Objective

Create a Docker image for the Starfish bridge CLI (`bridges/`) and publish it to GitHub Container Registry (ghcr.io). The bridge proxies external signal sources (MIDI, OSC) into starfish topics and needs to be deployable as a standalone container.

This task depends on the bridge implementation itself (`01kxfmdyt`).

## Tasks

- [ ] Create a `Dockerfile` in the bridge package directory with a multi-stage build
- [ ] Add a `.dockerignore` to exclude dev/test artifacts
- [ ] Add or extend a GitHub Actions workflow to build and push the image to `ghcr.io` on version tags
- [ ] Tag images with the git tag version and `latest`
- [ ] Ensure the container can be configured via environment variables or CLI flags (server address, signal source type, etc.)
- [ ] Verify the image starts correctly and can connect to a running Starfish server

## Acceptance Criteria

- A `Dockerfile` exists for the bridge package that produces a minimal image
- A GitHub Actions workflow builds and pushes the image to `ghcr.io/driangle/starfish-bridge` on `v*` tag pushes
- The container accepts configuration for target server and signal source via CLI flags or env vars
- The image size is kept small (multi-stage build, minimal base image)
