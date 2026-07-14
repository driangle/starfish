---
title: "Introduce StarfishError class in TypeScript SDK"
id: "01kxej4nc"
status: completed
priority: medium
type: feature
tags: ["sdk", "typescript", "error-handling"]
created_at: "2026-07-13"
completed_at: 2026-07-13
---

# Introduce StarfishError class in TypeScript SDK

## Objective

Replace all raw `new Error(...)` throws in the TypeScript SDK with a single `StarfishError` class that extends `Error` and adds a `code` string and optional `details` field. This enables programmatic error handling (`instanceof StarfishError`, switching on `code`) and eliminates the `Object.assign` hack in `pending.ts`. The existing `StarfishError` interface in `types.ts` (used for wire protocol error frames) should be replaced by the class.

## Error Codes

Errors across the SDK fall into these categories:

- `NOT_CONNECTED` — WebSocket not open
- `CONNECTION_FAILED` — WebSocket connection failed
- `CONNECTION_LOST` — connection dropped unexpectedly
- `DISCONNECTED` — client intentionally disconnected
- `NO_SESSION` — operation requires an active session
- `REQUEST_TIMEOUT` — pending request timed out
- `NO_WEBSOCKET` — no WebSocket implementation available
- `RTC_NOT_ENABLED` — RTC operation without RTC options
- `RTC_NO_PEER` — no RTC connection to peer
- `RTC_CHANNEL_NOT_OPEN` — DataChannel not open
- `PAYLOAD_TOO_LARGE` — payload exceeds size limit
- `TOPIC_NAME_TOO_LONG` — topic name exceeds max length
- `VALIDATION_ERROR` — non-serializable data detected
- `SERVER_ERROR` — error frame received from server (preserves server error code in details)

## Tasks

- [x] Create `StarfishError` class in `types.ts` extending `Error` with `code: string` and `details?: unknown`; remove the existing `StarfishError` interface
- [x] Export `StarfishError` class from `index.ts` (it's already exported as a type — ensure the class export replaces it)
- [x] Replace all `throw new Error(...)` in `connection.ts` with `throw new StarfishError(code, message)`
- [x] Replace all `throw new Error(...)` in `pending.ts`, including the `Object.assign` hack for server error frames
- [x] Replace all `throw new Error(...)` in `session.ts`, `data.ts`, `presence.ts`, `messaging.ts`, `topics.ts`
- [x] Replace all `throw new Error(...)` in `rtc.ts` and `client.ts`
- [x] Replace all `throw new Error(...)` in `limits.ts` and `validate.ts`
- [x] Update existing tests to assert `StarfishError` with correct `code` values where error behavior is tested
- [x] Add unit tests verifying `StarfishError` is an `instanceof Error` and carries the correct `code`

## Acceptance Criteria

- All errors thrown by the SDK are instances of `StarfishError` with a descriptive `code` string
- `StarfishError` extends `Error` so standard `catch` and stack traces work unchanged
- Server-sent error frames produce a `StarfishError` with `code: "SERVER_ERROR"` and the original server error in `details`
- The `StarfishError` class is exported from the package entry point
- All existing tests pass
- Users can distinguish error types programmatically via `instanceof StarfishError` and `error.code`
