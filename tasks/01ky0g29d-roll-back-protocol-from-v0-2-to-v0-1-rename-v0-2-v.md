---
title: "Roll back protocol from v0.2 to v0.1 (rename v0.2 → v0.1, remove old v0.1)"
id: "01ky0g29d"
status: pending
priority: high
type: chore
tags: ["protocol", "cleanup", "breaking"]
created_at: "2026-07-20"
phase: v0.1
---

# Roll back protocol from v0.2 to v0.1 (rename v0.2 → v0.1, remove old v0.1)

## Objective

We reved the protocol to v0.2 (adding the optional auth handshake, commit
`94eee63`), but nobody consumes it yet, so we want to stay on v0.1. Collapse v0.2
back into v0.1: **everything currently labeled v0.2 becomes the new v0.1**, the
**old v0.1 is deleted**, and **no reference to v0.2 remains** anywhere in docs or
code. This is effectively a rename — the v0.2 feature set (including auth) is
kept, it just carries the v0.1 name and wire version going forward.

**Decision (confirmed with user):** the wire-format version integer changes
`2 → 1`. The code currently sends/accepts protocol version `2`
(`versions: [2]`, `"version": 2`, `"v": 2`); the old v0.1 used integer `1`. After
this task the new v0.1 presents as protocol version **`1`** on the wire, leaving
zero trace of `2`.

## Scope / current state

The version lives in three layers, all of which must move:

1. **Spec files** (`protocol/spec/`):
   - `starfish-v0.2.md` — the current/authoritative spec (has the auth handshake). **Becomes the new `starfish-v0.1.md`.**
   - `starfish-v0.1.md` — the old, superseded spec. **Delete it.**
   - Inside the spec, wire version is `2` (e.g. `"version": 2`, "Current version: `2`", "agree on protocol version `2`"). Change to `1`.

2. **Doc labels / links**:
   - `protocol/README.md` — table + prose reference `spec/starfish-v0.2.md` and label it "(v0.2, current)" / "(v0.1, superseded)".
   - `README.md` (root) — links to `protocol/spec/starfish-v0.1.md` (already points at v0.1 filename; verify link stays valid after rename).

3. **Code — wire version integer `2 → 1`** (grep confirmed these; re-grep to be exhaustive):
   - `sdks/golang/starfish/handshake.go` — `"versions": []int{2}` (two occurrences).
   - `sdks/typescript/src/connection.ts` — `v: 2`, `versions: [2]` (multiple).
   - `servers/golang/starfish/handler_connection.go` — `"version": 2` (×2) and the `versionSupported` / "includes v2" comment logic.
   - `servers/python/src/starfish_server/handler_connection.py` — `"v": 2`.
   - Swift/JVM SDKs if/when they carry a version int — grep them too.
   - Rebuild any generated/`dist/` outputs (e.g. `servers/typescript/dist/`) so they don't retain `2`.

4. **taskmd metadata** (`.taskmd.yaml` + task files):
   - `.taskmd.yaml` defines a `v0.2` phase — remove it (and reassign any `phase: v0.2` tasks to `v0.1`).
   - Several task files reference `protocol/spec/starfish-v0.2.md` (the auth tasks: `01kxh8eby`, `01ky0fjt*`, `01ky0fjtm`) or `phase: v0.2` — repoint them to `starfish-v0.1.md` / `phase: v0.1`.

> NB: version *package* numbers like `v0.1.0` / `servers/golang/v0.1.0` and the
> `v0.1.1` phase are unrelated release tags — **do not** touch those. Only the
> protocol spec version (v0.1 vs v0.2) and the wire integer (1 vs 2) are in scope.

## Tasks

- [ ] Delete the old `protocol/spec/starfish-v0.1.md`, then rename `starfish-v0.2.md` → `starfish-v0.1.md` (use `git mv`).
- [ ] Inside the new `starfish-v0.1.md`, replace every "v0.2" label and every wire version `2` with `v0.1` / `1` (header `v` field, "Current version", welcome payload `version`, examples). Verify no stale `2`s remain where `1` is meant.
- [ ] Update `protocol/README.md` table and prose: single "current" spec = v0.1; drop the superseded-v0.1 / current-v0.2 framing.
- [ ] Verify `README.md` (root) link to `protocol/spec/starfish-v0.1.md` still resolves.
- [ ] Change the wire version integer `2 → 1` in all SDKs and servers (Go, TypeScript, Python, Swift, JVM): `versions` arrays, sent `version`/`v` fields, and any `versionSupported`/accept checks and their comments.
- [ ] Rebuild committed generated artifacts (`servers/typescript/dist/`, any other `dist/`) so they carry `1`, not `2`.
- [ ] Update integration/unit tests that assert on version `2` (e.g. handshake tests) to expect `1`; keep `protocol.unsupported_version` error tests meaningful (they should now reject non-`1` versions).
- [ ] Remove the `v0.2` phase from `.taskmd.yaml`; reassign `phase: v0.2` tasks to `v0.1`.
- [ ] Repoint task files referencing `protocol/spec/starfish-v0.2.md` to `starfish-v0.1.md`.
- [ ] Final sweep: `grep -rn "v0\.2\|starfish-v0\.2" --exclude-dir=node_modules --exclude-dir=.git .` returns nothing (except this task file / historical git commit messages); confirm no code path still emits or accepts wire version `2`.
- [ ] Run the full build + integration test matrix (Go/Python/TS SDKs against Go/Python/TS servers) to confirm handshake still succeeds end-to-end on version `1`.

## Acceptance Criteria

- `protocol/spec/starfish-v0.1.md` exists and is the v0.2 content (auth handshake included), relabeled as v0.1; no `starfish-v0.2.md` file remains.
- A repo-wide grep for `v0.2` / `starfish-v0.2` finds **no** references in docs, code, generated artifacts, `.taskmd.yaml`, or task frontmatter (git history and this task file excepted).
- Every SDK and server negotiates and reports protocol version **`1`** on the wire; no code emits or accepts `2`.
- All builds pass and the full SDK↔server integration test matrix is green with the version-`1` handshake.
- `taskmd validate` passes (no dangling `v0.2` phase references).
