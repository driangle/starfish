---
title: "Write user guide documentation"
id: "01kx31gbj"
status: completed
priority: medium
type: feature
tags: ["docs"]
created_at: "2026-07-09"
phase: v0.1
dependencies: [01kwyst27, 01kx1s2ca]
completed_at: 2026-07-14
---

# Write user guide documentation

## Objective

Write a comprehensive user guide for the Starfish TypeScript SDK as VitePress pages within the project's documentation site. The guide should explain concepts, APIs, configuration, and best practices in a progressive, tutorial-style format. All content lives in the VitePress site set up by the documentation site task.

## Tasks

- [x] Write **Installation** page — npm/yarn/pnpm install, peer dependencies, environment requirements (browser vs Node)
- [x] Write **Quick Start** page — minimal working example: connect to a server, join a session, send a message, receive a message
- [x] Write **Core Concepts** page — explain sessions, topics, presence, data operations, frames, delivery options, and connection lifecycle
- [x] Write **Configuration** page — document `StarfishClientOptions` including server URL, auth, reconnect strategy, WebSocket factory, and RTC options
- [x] Write **API Overview** page — summary of `StarfishClient` public methods, `Observable`/`EventStream`, `Clock`, `Presence`, key types
- [x] Write **Architecture** page — how the client manages connections, frame protocol, transport selection (WebSocket vs WebRTC), reconnection flow
- [x] Write **Common Workflows** page — joining/leaving sessions, pub/sub with topics, presence tracking, persisting shared data with `SaveOptions`/`DataOp`, request/reply patterns
- [x] Write **Best Practices** page — error handling, reconnection strategies, delivery option tradeoffs (`reliable` vs `unreliable` vs `latest`), resource cleanup
- [x] Write **Troubleshooting** page — common errors, connection issues, debugging tips
- [x] Update VitePress sidebar config to include all guide pages
- [x] Review for accuracy against the current SDK source code

## Acceptance Criteria

- Guide pages exist under `docs/guide/` as VitePress-compatible markdown
- All sections listed above are present and contain substantive, accurate content
- Code examples compile against the current TypeScript SDK types
- Pages are linked in the VitePress sidebar navigation
- No placeholder or TODO content remains in the published guide
