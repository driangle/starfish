---
title: "Signal bridge core: project scaffold, BridgeConnector interface, CLI, and shared starfish connection"
id: "01kxtrwnb"
status: pending
priority: medium
type: feature
tags: ["bridge", "cli"]
created_at: "2026-07-18"
---

# Signal bridge core: project scaffold, BridgeConnector interface, CLI, and shared starfish connection

## Objective

Scaffold the `@starfish/bridge` CLI package and implement the core infrastructure that all protocol connectors share: project setup, the `BridgeConnector` interface, shared starfish connection logic (publish *and* subscribe), CLI arg parsing with subcommands, the required direction positional, and build targets.

### Direction convention

Every connector is potentially bi-directional, so direction is a first-class, universal concept — not a per-connector afterthought. Direction is a **required positional argument** immediately after the connector name (`starfish-bridge <connector> <in|out|both>`), following the conventional nested-subcommand shape (`kubectl config use-context`, `aws s3 cp`) rather than a `--direction` flag. There is no default — the operator always states the direction explicitly. Its meaning is **always relative to starfish**:

| direction | Data flow | Meaning |
|-----------|-----------|---------|
| `in` | external endpoint → starfish topic | ingest external signals into starfish |
| `out` | starfish topic → external endpoint | drive external endpoints from starfish |
| `both` | external ↔ starfish | bidirectional bridge |

Anchoring "in/out" to starfish (rather than to each device) is the only frame that stays consistent across all six protocols. `in` runs the publish path; `out` runs the subscribe path; `both` runs both. Connectors that need distinct endpoint config per direction expose `--in-*` / `--out-*` flags (see per-connector tasks), and flags irrelevant to the chosen direction are rejected rather than silently ignored.

### Project Structure

```
bridges/
└── bridge/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts               # CLI entry point (arg parsing, orchestration)
    │   ├── types.ts              # BridgeConnector interface + Direction type
    │   ├── connectors/           # Protocol connectors (added by sibling tasks)
    │   └── starfish.ts           # Shared connect/join/publish/subscribe logic
    └── bin/
        └── starfish-bridge.js    # Shebang entry point
```

### CLI Interface

```bash
starfish-bridge <connector> <in|out|both> --server <url> --session <name> --topic <topic> [connector-specific flags]
```

## Tasks

- [ ] Scaffold `bridges/bridge/` project (package.json, tsconfig, eslint, bin entry point)
- [ ] Define `Direction` type (`in | out | both`) and the `BridgeConnector` interface (name, supported directions, flags registration, and a `start(direction)`/`stop` lifecycle so a connector can run the in path, the out path, or both)
- [ ] Implement shared starfish connection logic: connect, join session, a `publish` helper (for the `in` path) and a `subscribe` helper (for the `out` path)
- [ ] Implement CLI arg parsing with a two-level positional structure — `<connector> <direction>` — plus common flags (--server, --session, --topic, --create-session, --reliability, --transport); direction is a required positional with no default
- [ ] Validate the requested direction against what each connector supports, and reject flags that are irrelevant to (or missing for) the chosen direction, with clear errors
- [ ] Add Makefile targets for build, lint, test, format
- [ ] Add a README with usage examples for the overall CLI, documenting the direction convention

## Acceptance Criteria

- `bridges/bridge/` builds and produces a `starfish-bridge` CLI binary
- Running `starfish-bridge --help` lists available connector subcommands and common flags
- Running `starfish-bridge <connector> --help` shows which directions that connector supports and the flags relevant to each
- The `BridgeConnector` interface is defined such that adding a new connector requires only implementing the interface and registering it — no changes to core CLI logic
- The interface expresses direction so a connector can advertise and implement `in`, `out`, or `both`
- Direction is a required positional (`<connector> <in|out|both>`) with no default; omitting it errors, and requesting a direction a connector doesn't support errors clearly
- Flags irrelevant to the chosen direction (e.g. `--out-host` under `in`), or required flags missing for it, are rejected rather than silently ignored
- Common flags (--server, --session, --topic) and the direction positional are parsed and validated before connector-specific logic runs
- The CLI prints helpful errors when required args are missing
- Makefile targets (build, lint, test, format) work correctly
