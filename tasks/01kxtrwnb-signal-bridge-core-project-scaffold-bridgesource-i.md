---
title: "Signal bridge core: project scaffold, BridgeSource interface, CLI, and shared starfish connection"
id: "01kxtrwnb"
status: pending
priority: medium
type: feature
tags: ["bridge", "cli"]
created_at: "2026-07-18"
---

# Signal bridge core: project scaffold, BridgeSource interface, CLI, and shared starfish connection

## Objective

Scaffold the `@starfish/bridge` CLI package and implement the core infrastructure that all protocol sources share: project setup, the `BridgeSource` interface, shared starfish connection/publish logic, CLI arg parsing with subcommands, and build targets.

### Project Structure

```
bridges/
└── bridge/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── main.ts               # CLI entry point (arg parsing, orchestration)
    │   ├── types.ts              # BridgeSource interface
    │   ├── sources/              # Protocol sources (added by sibling tasks)
    │   └── starfish.ts           # Shared connect/join/publish logic
    └── bin/
        └── starfish-bridge.js    # Shebang entry point
```

### CLI Interface

```bash
starfish-bridge <source> --server <url> --session <name> --topic <topic> [source-specific flags]
```

## Tasks

- [ ] Scaffold `bridges/bridge/` project (package.json, tsconfig, eslint, bin entry point)
- [ ] Define `BridgeSource` interface (name, flags registration, start/stop lifecycle)
- [ ] Implement shared starfish connection logic (connect, join session, publish helper, subscribe helper for bidirectional bridges)
- [ ] Implement CLI arg parsing with subcommands per source type and common flags (--server, --session, --topic, --create-session, --reliability, --transport)
- [ ] Add Makefile targets for build, lint, test, format
- [ ] Add a README with usage examples for the overall CLI

## Acceptance Criteria

- `bridges/bridge/` builds and produces a `starfish-bridge` CLI binary
- Running `starfish-bridge --help` lists available source subcommands and common flags
- The `BridgeSource` interface is defined such that adding a new source requires only implementing the interface and registering it — no changes to core CLI logic
- Common flags (--server, --session, --topic) are parsed and validated before source-specific logic runs
- The CLI prints helpful errors when required args are missing
- Makefile targets (build, lint, test, format) work correctly
