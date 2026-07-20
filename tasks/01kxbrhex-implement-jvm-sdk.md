---
title: "Implement JVM SDK"
id: "01kxbrhex"
status: pending
priority: low
type: feature
tags: ["sdk", "jvm"]
created_at: "2026-07-12"
phase: v0.2
---

# Implement JVM SDK

## Objective

Implement a JVM-based client SDK for the Starfish protocol (v0.1) as defined in `protocol/spec/starfish-v0.1.md`. The exact JVM language (Kotlin, Java, Scala, etc.) is TBD — choose the best fit during implementation. This SDK follows the same patterns as the TypeScript, Python, and Go SDKs. Located in `sdks/jvm/` (or language-specific directory once decided).

## Tasks

- [ ] Evaluate JVM language choice (Kotlin, Java, Scala) and document decision
- [ ] Set up project with build tooling (Gradle/Maven, dependencies, package structure)
- [ ] Define core types: `StarfishFrame`, `StarfishError`, `Options`, `Delivery`
- [ ] Implement `StarfishClient` class with WebSocket connection lifecycle
- [ ] Implement `client.hello` / `server.welcome` handshake
- [ ] Implement reconnection with `resumeToken` support
- [ ] Implement session management (`join`, `leave`)
- [ ] Implement topic pub/sub (`subscribe`, `unsubscribe`, `publish`)
- [ ] Implement direct messaging (`send`)
- [ ] Implement broadcast (`broadcast` with `includeSelf` option)
- [ ] Implement presence (`presenceSet`, presence callbacks/reactive streams)
- [ ] Implement shared data operations (`save`, `get` with all ops and optimistic concurrency)
- [ ] Implement heartbeat (application-level `ping`/`pong`)
- [ ] Implement clock sync (`clockSync`, `clockNow`, `clockOffset`)
- [ ] Implement event filtering (reactive streams or callback-based)
- [ ] Implement message ID generation and `replyTo` correlation
- [ ] Implement transport selection logic
- [ ] Add payload size validation per protocol limits
- [ ] Write unit tests for message framing and type rewriting
- [ ] Write integration tests for session lifecycle and pub/sub
- [ ] Write integration tests for data operations

## Acceptance Criteria

- Client can connect, handshake, join/leave sessions over WebSocket
- Topic pub/sub works with correct type rewriting
- Direct messaging and broadcast deliver correctly
- Presence updates are sent and received
- Shared data operations work with all ops including optimistic concurrency
- Clock sync estimates server time offset
- Reconnection with `resumeToken` restores state
- Idiomatic JVM API (coroutines/reactive depending on language choice)
- All payload size limits are enforced
- API matches the SDK reference in spec section 22
