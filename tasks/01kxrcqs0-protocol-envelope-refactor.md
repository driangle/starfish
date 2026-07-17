---
title: "Refactor protocol spec: header/payload envelope, method/resource/kind, version negotiation, structured errors"
id: "01kxrcqs0"
status: pending
priority: critical
type: feature
tags: ["protocol", "breaking-change"]
created_at: "2026-07-17"
---

# Refactor protocol spec: header/payload envelope, method/resource/kind, version negotiation, structured errors

## Objective

Redesign the Starfish protocol envelope from a flat frame structure to a conventional `header`/`payload` split, with explicit `method`/`resource`/`kind` fields, version negotiation during handshake, and structured error responses. This is the foundational spec change that all SDK/server/adapter tasks depend on.

## Tasks

- [ ] Define the new `header` object schema: `v`, `id`, `method`, `resource`, `kind`, `ts`, `session`, `from`, `to`, `topic`, `replyTo`, `meta` (open `Record<string, unknown>`)
- [ ] Define `kind` enum: `request`, `response`, `event`
- [ ] Define `method` vocabulary per resource (e.g. `session.join` → `method: "join"`, `resource: "session"`)
- [ ] Move `options` (delivery, priority, ttl) into `header`
- [ ] Define version negotiation in `client.hello`/`server.welcome`: client sends supported versions array, server selects one
- [ ] Remove per-frame `v` field after handshake (implicit for connection lifetime)
- [ ] Define structured error format: `status: "error"`, `error.code`, `error.resource`, `error.message`, `error.retry`
- [ ] Define response format: `status: "ok"` or `status: "error"` with `replyTo`
- [ ] Update all message type examples throughout the spec
- [ ] Document migration guide from v1 envelope to v2 envelope
- [ ] Update reserved fields list

## Acceptance Criteria

- The spec defines a clear `header`/`payload` separation with no application data at the top level
- Every frame example in the spec uses the new envelope format
- `kind` field makes frame direction unambiguous (request vs response vs event)
- `method` + `resource` replaces the `type` field for all message types
- Version negotiation is specified for the handshake exchange
- Error responses include `retry` hint and structured `code`/`resource` fields
- `header.meta` provides an extensible metadata bag for both sides
- Migration guide covers every v1 message type and its v2 equivalent
