---
title: "Rename 'data'/'save' protocol namespace to 'state' and align presence verbs"
id: "01ky4cw31"
status: pending
priority: medium
type: feature
tags: ["protocol", "naming", "breaking-change"]
created_at: "2026-07-22"
---

# Rename 'data'/'save' protocol namespace to 'state' and align presence verbs

## Objective

Presence and the durable data store are two flavors of the same idea — shared session state — but their names come from different metaphors, so they don't read as a pair. `presence` (a "who's here" metaphor) sits in a different namespace from `data`/`save` (a generic "everything is data" word), even though presence is data too. The write verbs also diverge: `presence/set` vs `data/save`.

Rename the durable store's resource from `data` to `state` so the two mechanisms read as siblings on the same axis: `presence` (ephemeral, live, per-client, full-replace) vs `state` (durable, saved, keyed, versioned, partial-update). Align the write verb so both use `set` (`presence/set` + `state/set`).

This is a **breaking protocol change** and should ship as part of a protocol version bump (v0.2). The semantic separation between the two mechanisms is intentional and must be preserved — this is a naming/namespace change only, not a merge.

**Design decision context:** we deliberately keep the two mechanisms separate (matching Liveblocks `presence`/`storage`, Yjs `awareness`/docs). The problem being fixed is legibility of the pairing, not the separation itself. See related discussion — presence stays `presence`; only the counterpart is renamed to make the sibling relationship obvious.

## Tasks

- [ ] Update the spec `protocol/spec/` (new `starfish-v0.2.md` or successor): rename resource `data` → `state`; rename methods `data/save` → `state/set`, `data/get` → `state/get`, event `data/changed` → `state/changed`. Update the glossary entry ("Data store" → "State store") and all examples.
- [ ] Update SDK sugar in the spec: `starfish.save({...})` / `starfish.get({...})` → `starfish.state.set({...})` / `starfish.state.get({...})` (confirm final ergonomics).
- [ ] TypeScript server: rename `handler_data.ts` → `handler_state.ts`, `data_store.ts` → `state_store.ts` (types `DataStore`/`DataEntry` → `StateStore`/`StateEntry`), and the routed method strings. Update `session.ts` field `data` → `state`.
- [ ] Python server: mirror the rename in `handler_data.py`, `data_store.py`, `session.py`.
- [ ] Go server: mirror the rename in `data_store.go`, `data_store_ops.go`, `handler_data.go`, `session.go`.
- [ ] TypeScript SDK: rename `data.ts` module → `state.ts` (`Data` class → `State`), `save()` → `set()`, keep `get()`, `changed$`/`key$` renamed accordingly; update `client.ts` wiring and `types.ts` (`SaveOptions`/`DataResult` → `SetOptions`/`StateResult`).
- [ ] Python SDK: mirror in `data.py`, `client.py`, `__init__.py`.
- [ ] Go SDK: mirror in `data.go`, `client.go`.
- [ ] Swift SDK: mirror in `DataModule.swift`, `Types.swift`, `StarfishClient.swift`.
- [ ] Update all tests referencing `data`/`save` across servers and SDKs.
- [ ] Update docs (`docs/`) and any scenarios/examples that reference `save`/`data`.
- [ ] Decide and document migration/compat story: hard break at v0.2, or transitional aliasing of the old `data/*` methods during a deprecation window.

## Acceptance Criteria

- Spec defines the durable store under resource `state` with methods `state/set`, `state/get`, and event `state/changed`; no remaining references to `data/save` or `data/get` in the normative spec.
- Both write mechanisms use the `set` verb: `presence/set` and `state/set`.
- All servers (TypeScript, Python, Go) route the new method strings and pass their existing test suites (renamed).
- All SDKs (TypeScript, Python, Go, Swift) expose the renamed `state` API and pass integration tests against a server.
- The ephemeral-vs-durable semantic separation is unchanged (throttling, full-replace, versioning, partial ops all behave as before) — only names/namespaces changed.
- `taskmd validate` passes; docs and examples reference `state`/`set`, not `data`/`save`.
- Migration/compatibility decision is documented in the spec's changelog or a migration note.
