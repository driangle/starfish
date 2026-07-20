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

Scaffold the `@starfish/bridge` CLI package and implement the core infrastructure that all protocol connectors share: project setup, the `BridgeConnector` interface, shared starfish connection logic (publish *and* subscribe), CLI arg parsing with subcommands, the universal `--direction` flag, and build targets.

### Direction convention

Every connector is potentially bi-directional, so direction is a first-class, universal concept — not a per-connector afterthought. A single `--direction <in|out|both>` flag is defined on every connector, and its meaning is **always relative to starfish**:

| `--direction` | Data flow | Meaning |
|---------------|-----------|---------|
| `in` (default) | external endpoint → starfish topic | ingest external signals into starfish |
| `out` | starfish topic → external endpoint | drive external endpoints from starfish |
| `both` | external ↔ starfish | bidirectional bridge |

Anchoring "in/out" to starfish (rather than to each device) is the only frame that stays consistent across all six protocols. `in` runs the publish path; `out` runs the subscribe path; `both` runs both. Connectors that need distinct endpoint config per direction expose `--in-*` / `--out-*` flags (see per-connector tasks), but the `--direction` flag itself is identical everywhere.

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
starfish-bridge <connector> --server <url> --session <name> --topic <topic> [--direction in|out|both] [connector-specific flags]
```

## Tasks

- [ ] Scaffold `bridges/bridge/` project (package.json, tsconfig, eslint, bin entry point)
- [ ] Define `Direction` type (`in | out | both`) and the `BridgeConnector` interface (name, flags registration, and a `start(direction)`/`stop` lifecycle so a connector can run the in path, the out path, or both)
- [ ] Implement shared starfish connection logic: connect, join session, a `publish` helper (for the `in` path) and a `subscribe` helper (for the `out` path)
- [ ] Implement CLI arg parsing with subcommands per connector and common flags (--server, --session, --topic, --direction, --create-session, --reliability, --transport); default --direction to `in`
- [ ] Validate `--direction` against what each connector actually supports, with a clear error if an unsupported direction is requested
- [ ] Add Makefile targets for build, lint, test, format
- [ ] Add a README with usage examples for the overall CLI, documenting the direction convention

## Acceptance Criteria

- `bridges/bridge/` builds and produces a `starfish-bridge` CLI binary
- Running `starfish-bridge --help` lists available connector subcommands and common flags, including `--direction`
- Running `starfish-bridge <connector> --help` shows which directions that connector supports
- The `BridgeConnector` interface is defined such that adding a new connector requires only implementing the interface and registering it — no changes to core CLI logic
- The interface expresses direction so a connector can advertise and implement `in`, `out`, or `both`
- `--direction` defaults to `in`, accepts `in|out|both`, and produces a clear error when a connector doesn't support the requested direction
- Common flags (--server, --session, --topic, --direction) are parsed and validated before connector-specific logic runs
- The CLI prints helpful errors when required args are missing
- Makefile targets (build, lint, test, format) work correctly
