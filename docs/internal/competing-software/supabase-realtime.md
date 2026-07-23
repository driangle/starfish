# Supabase Realtime

> Postgres-backed broadcast, presence, and database-change channels.
> See the [overview](./index.md) and shared [axes](./axes.md).

## What it is

Supabase Realtime is the realtime layer of the **Supabase** platform — an open-source
Firebase alternative built on PostgreSQL. It's an Elixir/Phoenix server that gives clients
three channel features: **Broadcast** (low-latency pub/sub messages), **Presence** (shared
ephemeral member state), and **Postgres Changes** (subscribe to inserts/updates/deletes on
your database tables via logical replication). It's most compelling when your app already
lives on Supabase/Postgres.

## How it works

- Clients open a WebSocket and join a **channel** (a topic string).
- **Broadcast**: send/receive arbitrary messages on the channel (ephemeral pub/sub).
- **Presence**: each client tracks state on the channel; join/leave/sync events keep everyone's
  membership view current.
- **Postgres Changes**: the server tails the database's replication stream and pushes row-level
  changes to subscribed clients, filtered and gated by Row-Level Security.
- Self-hostable (the whole Supabase stack is OSS) or used via Supabase's hosted platform.

## At a glance

| Axis | Supabase Realtime |
|------|-------------------|
| Category | Hosted service (also self-hostable OSS) |
| Transport | WebSocket (Phoenix channels) |
| Deployment | Hosted (Supabase) or self-host the OSS stack |
| Presence | Yes — first-class presence on channels |
| Pub/Sub | Yes — Broadcast |
| Shared-state model | None as a primitive; state lives in **Postgres** (subscribe via CDC) |
| Matchmaking | No |
| Language & runtime | JS/TS first-class; other client libs; server is Elixir/Phoenix |
| Licensing / cost | Apache-2.0 (self-host) + usage-based hosted plans |
| Creative-coding fit | Moderate — great if you're already on Postgres, DB-centric |

## Overlap with Starfish

- **Broadcast pub/sub** and **presence** map directly onto Starfish topics and presence.
- Both are **self-hostable** (Supabase is OSS) and speak WebSocket.

## Where Starfish differs / wins

- **No database dependency.** Supabase Realtime's distinctive feature — Postgres Changes — is
  only valuable if your source of truth is Postgres. Starfish needs no database and models
  shared state directly in the session.
- **WebRTC peer-to-peer** for latency-sensitive creative traffic; Supabase relays through the
  Phoenix server.
- **Matchmaking pools** and **structured shared-data ops** have no Supabase equivalent.
- **Multi-language SDKs** and creative-coding-shaped delivery controls; Supabase is JS-first
  and DB-app-shaped.

## Where it beats Starfish

- **Database-integrated realtime.** If your app's truth is in Postgres, streaming row changes
  with RLS security is a superpower Starfish doesn't attempt — you get realtime "for free" off
  your existing data model.
- **Full BaaS platform.** Auth, storage, edge functions, and a managed Postgres alongside the
  realtime layer.
- **Persistence and durability** by virtue of the database; Starfish's session state is
  ephemeral.

## Verdict

Supabase Realtime wins when your app is **Postgres/Supabase-centric** and you want realtime
that's wired into your database (change streams + auth + storage in one platform). Starfish
wins when you want a **standalone, database-free realtime protocol** with WebRTC, matchmaking,
and multi-language clients — where "shared state" is a live session concept, not database rows.

## How we position against this

"Supabase Realtime shines when your data already lives in Postgres — Broadcast and Presence
plus live database-change streams, all with row-level security. But it's database-shaped,
JS-first, and has no matchmaking or P2P. Starfish is a standalone realtime protocol: presence
and pub/sub too, plus shared session state, matchmaking, and WebRTC, with no database to run.
Pick Supabase if Postgres is your backbone; pick Starfish for database-free, creative realtime
you self-host."
