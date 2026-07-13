---
title: "Validate serializable data in TypeScript SDK before JSON.stringify"
id: "01kxbshyf"
status: completed
priority: medium
type: feature
tags: ["sdk", "typescript", "validation"]
created_at: "2026-07-12"
completed_at: 2026-07-13
---

# Validate serializable data in TypeScript SDK before JSON.stringify

## Objective

Add validation to the TypeScript SDK to detect non-JSON-serializable values (functions, `undefined`, `Symbol`, circular references, `BigInt`) before they reach `JSON.stringify`. Currently these values are silently dropped or cause runtime errors with no indication of what went wrong. The SDK should throw a clear, actionable error at the point of use.

## Affected Code Paths

- `data.ts` — `save()` serializes `options.data`
- `connection.ts` — `send()` serializes the full frame (affects `publish`, `send`, `broadcast`)
- `presence.ts` — `set()` serializes presence payload
- `rtc.ts` — `sendRTC()` serializes RTC frames

## Tasks

- [x] Create a `validateSerializable(value, label)` utility that walks the value and throws a descriptive `StarfishError` if it encounters a non-serializable type (function, undefined, Symbol, BigInt, circular ref)
- [x] Call the validator in `Data.save()` before stringifying `options.data`
- [x] Call the validator in `Presence.set()` before stringifying the payload
- [x] Call the validator in `Connection.send()` or at each callsite (`publish`, `send`, `broadcast`) — choose the narrowest choke point
- [x] Call the validator in `RTC.send()` before stringifying the frame
- [x] Add unit tests covering: functions, undefined values, Symbols, BigInt, circular objects, and nested non-serializable values
- [x] Ensure error messages include the key path to the offending value (e.g. `"data.callback is a function and cannot be serialized"`)

## Acceptance Criteria

- Passing a function, Symbol, BigInt, or circular reference as data to `save`, `publish`, `send`, `broadcast`, `presence.set`, or `sendRTC` throws a `StarfishError` with a message identifying the non-serializable value and its path
- Valid serializable data (strings, numbers, booleans, null, plain objects, arrays) continues to work without error
- Existing tests pass
