---
title: "Publish Python SDK to PyPI"
id: "01kxaezyv"
status: in-progress
priority: medium
type: chore
tags: ["publish", "sdk", "python"]
phase: v0.1
created_at: "2026-07-12"
dependencies: [01kwyst2r, 01kxgg8s0]
---

# Publish Python SDK to PyPI

## Objective

Publish the Python SDK (`sdks/python`) to PyPI so users can `pip install` it.

## Tasks

- [x] Verify `pyproject.toml` has correct metadata (name, version, description, URLs)
- [x] Add a LICENSE file if not present
- [ ] Set up PyPI account and API token for publishing
- [x] Build the distribution (`python -m build`)
- [ ] Publish to PyPI (`twine upload`)
- [x] Verify installation works via `pip install`
- [x] Add installation instructions to the SDK README

## Acceptance Criteria

- The package is installable via `pip install` from PyPI
- The PyPI page shows correct metadata, description, and version
