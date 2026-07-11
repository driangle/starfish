---
title: "Write user guide documentation"
id: "01kx31gbj"
status: pending
priority: medium
type: feature
tags: ["docs"]
created_at: "2026-07-09"
phase: v0.1
---

# Write user guide documentation

## Objective

Write a comprehensive user guide for the Starfish TypeScript SDK that helps developers learn the library from scratch. The guide should explain concepts, APIs, configuration, and best practices in a progressive, tutorial-style format. The docs directory does not exist yet and needs to be created.

## Tasks

- [ ] Create `docs/` directory structure (`docs/guide/`, `docs/cookbook/` — cookbook is a separate task)
- [ ] Write **Installation** section — npm/yarn/pnpm install, peer dependencies, environment requirements (browser vs Node)
- [ ] Write **Quick Start** section — minimal working example: connect to a server, join a session, send a message, receive a message
- [ ] Write **Core Concepts** section — explain sessions, topics, presence, data operations, frames, delivery options, and connection lifecycle
- [ ] Write **Configuration** section — document `StarfishClientOptions` including server URL, auth, reconnect strategy, WebSocket factory, and RTC options
- [ ] Write **API Overview** section — summary of `StarfishClient` public methods, `Observable`/`EventStream`, `Clock`, `Presence`, key types
- [ ] Write **Architecture** section — how the client manages connections, frame protocol, transport selection (WebSocket vs WebRTC), reconnection flow
- [ ] Write **Common Workflows** section — joining/leaving sessions, pub/sub with topics, presence tracking, persisting shared data with `SaveOptions`/`DataOp`, request/reply patterns
- [ ] Write **Best Practices** section — error handling, reconnection strategies, delivery option tradeoffs (`reliable` vs `unreliable` vs `latest`), resource cleanup
- [ ] Write **Troubleshooting** section — common errors, connection issues, debugging tips
- [ ] Review for accuracy against the current SDK source code

## Acceptance Criteria

- A `docs/guide/` directory exists with the user guide content
- All sections listed above are present and contain substantive, accurate content
- Code examples compile against the current TypeScript SDK types
- Guide is navigable with a table of contents or clear section structure
- No placeholder or TODO content remains in the published guide
