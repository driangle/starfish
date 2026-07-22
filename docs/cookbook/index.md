# Cookbook

Practical recipes for building with Starfish. Each recipe solves a specific problem with working code examples in TypeScript, Python, and Swift.

## Recipes

### Getting Connected
- [Connect with Automatic Reconnection](./auto-reconnect) — configure resilient connections that recover from network failures
- [Handle Connection State Changes](./connection-state) — react to connection lifecycle events

### Sessions & Presence
- [Join a Session and Track Who's Online](./presence) — monitor connected clients with Presence

### Messaging
- [Publish/Subscribe to a Topic](./pub-sub) — basic pub/sub messaging pattern
- [Send Reliable vs Unreliable Messages](./reliable-vs-unreliable) — choose the right delivery mode
- [Broadcast to Specific Clients](./targeted-messaging) — send messages to selected recipients
- [Request/Reply Pattern](./request-reply) — RPC-style communication with `replyTo`

### Matchmaking
- [Random Pairing with Auto Mode](./pool-auto-pairing) — pair strangers automatically with pools
- [Attribute Filtering](./pool-filtered-matching) — match only compatible clients with `filter`
- [Custom Matchmaker with Delegated Mode](./pool-delegated-matchmaker) — form groups yourself with `assign()`
- [Re-pairing When a Peer Disconnects](./pool-repaired-on-disconnect) — find a new partner when yours leaves

### Data & State
- [Store and Sync Shared State](./shared-state) — use data operations for collaborative state

### Advanced
- [Filter Events by Type or Topic](./event-filtering) — selectively handle events
- [Use WebRTC Data Channels](./webrtc-data-channels) — low-latency peer-to-peer messaging
