---
title: "Publish Python server to PyPI"
id: "01kxaf016"
status: pending
priority: medium
type: chore
tags: ["publish", "server", "python"]
created_at: "2026-07-12"
dependencies: [01kwyst53]
phase: v0.2
---

# Publish Python server to PyPI

## Objective

Publish the Python server (`servers/python`) to PyPI so users can `pip install` and run it.

## Tasks

- [ ] Verify `pyproject.toml` has correct metadata (name, version, description, URLs, entry points)
- [ ] Add a LICENSE file if not present
- [ ] Set up PyPI account and API token for publishing
- [ ] Build the distribution (`python -m build`)
- [ ] Publish to PyPI (`twine upload`)
- [ ] Verify installation and startup works via `pip install`
- [ ] Add installation/usage instructions to the server README

## Acceptance Criteria

- The package is installable via `pip install` from PyPI
- The server can be started after installation
- The PyPI page shows correct metadata, description, and version
