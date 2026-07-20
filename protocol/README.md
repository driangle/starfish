# Protocol

The Starfish protocol specification and message schema definitions.

## Contents

| Path | Description |
|------|-------------|
| [spec/starfish-v0.1.md](spec/starfish-v0.1.md) | Full protocol specification (v0.1, current) |
| [schema/](schema/) | Message schema definitions |

## Overview

Starfish uses a single canonical message envelope across all transports. WebSocket serves as the required control plane for authentication, session management, presence, subscriptions, and signaling. WebRTC is an optional data plane for low-latency peer-to-peer communication.

Core concepts: **Server** (session coordinator), **Session** (named realtime room), **Client** (participant), **Topic** (pub/sub channel), **Peer** (another client in the session), and **Data store** (scoped key-value state).

See the [specification](spec/starfish-v0.1.md) for full details on the connection lifecycle, message format, and transport responsibilities.
