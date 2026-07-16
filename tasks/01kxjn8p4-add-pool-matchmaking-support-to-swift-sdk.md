---
title: "Add pool matchmaking support to Swift SDK"
id: "01kxjn8p4"
status: completed
priority: high
type: feature
tags: ["pool", "sdk", "swift"]
created_at: "2026-07-15"
dependencies: ["01kxjn8kw", "01kxjn8m7", "01kxjn8mq"]
phase: v0.1.1
completed_at: 2026-07-16
---

# Add pool matchmaking support to Swift SDK

## Objective

Implement pool matchmaking support in the Swift SDK (`sdks/swift/`) following the Starfish protocol spec section 7. This exposes all five pool modes (auto, claim, mutual, propose, delegated) through a `Pool` module that matches the style of existing modules such as `Session`, `Presence`, and `DataModule`.

Use the TypeScript SDK pool implementation (task `01kxjn8mq`) as a reference for behavior and API shape, then adapt it to Swift idioms: `async/await` for request/response operations, `AsyncStream` for observable state, and `Observable<T>` / `EventStream<T>` from `Emitter.swift` for internal reactive primitives.

## Tasks

- [x] Add pool-related types to `Types.swift`:
  - `PoolMode` enum: `auto`, `claim`, `mutual`, `propose`, `delegated`
  - `PoolRole` enum: `member`, `matchmaker`
  - `PoolMember` struct: `id: String`, `attributes: [String: AnyCodable]?`
  - `PoolEnterOptions` struct: `pool`, `create`, `mode`, `groupSize`, `role`, `attributes`, `filter`
  - `PoolMatchResult` struct: `pool`, `session`, `peers: [PoolMember]`
  - `PoolAssignedResult` struct: `pool`, `matched: [PoolAssignedGroup]`
  - `PoolAssignedGroup` struct: `group: [String]`, `session: String`
  - Add `notInPool`, `poolModeNotAllowed` cases to `StarfishError.ErrorCode`

- [x] Create `sdks/swift/Sources/StarfishClient/Pool.swift`:
  - `public final class Pool: @unchecked Sendable`
  - Internal state: `_members: [String: PoolMember]` per pool (for claim-based modes), set of entered pool names
  - `public let members$ = Observable<[PoolMember]>([])` — updated on `pool.member.joined` / `pool.member.left`
  - `public let matched$ = EventStream<PoolMatchResult>()` — emits on `pool.matched`
  - `func enter(_ options: PoolEnterOptions) async throws -> StarfishFrame` — sends `pool.enter`, waits for `pool.entered`; populates `members$` from response in claim-based modes
  - `func leave(pool: String) throws` — sends `pool.leave`
  - `func claim(pool: String, target: String) async throws -> StarfishFrame` — sends `pool.claim`, waits for server response (`pool.matched` or `pool.claim.pending`)
  - `func accept(pool: String, from: String) throws` — sends `pool.accept` (propose mode)
  - `func reject(pool: String, from: String) throws` — sends `pool.reject` (propose mode)
  - `func assign(pool: String, groups: [[String]]) async throws -> StarfishFrame` — sends `pool.assign`, waits for `pool.assigned` (delegated/matchmaker mode)
  - `func handleFrame(_ frame: StarfishFrame)` — dispatches incoming pool frames:
    - `pool.member.joined` → update `members$`
    - `pool.member.left` → update `members$`
    - `pool.matched` → emit on `matched$`
    - `pool.proposal` → emit on `proposals$`
    - `pool.claim.pending` → emit on `claimPending$`
    - `pool.claim.rejected` → emit on `claimRejected$`
    - `pool.assigned` → resolved by `PendingRequests` (already handled via `sendAndWait`)
  - `public let proposals$ = EventStream<StarfishFrame>()` — incoming proposals in propose mode
  - `public let claimPending$ = EventStream<StarfishFrame>()` — pending mutual claims
  - `public let claimRejected$ = EventStream<StarfishFrame>()` — rejected proposals

- [x] Wire `Pool` into `StarfishClient.swift`:
  - Add `private let _pool: Pool` initialized in `init`
  - Call `_pool.handleFrame(frame)` in `dispatchFrame`
  - Expose `public var pool: Pool { _pool }` for direct access
  - Add convenience passthrough methods:
    - `func enterPool(_ options: PoolEnterOptions) async throws -> StarfishFrame`
    - `func leavePool(_ pool: String) throws`
    - `var poolMembers: AsyncStream<[PoolMember]>`
    - `var poolMatched: AsyncStream<PoolMatchResult>`

- [x] Write tests in `Tests/StarfishClientTests/PoolTests.swift`:
  - Test `pool.enter` in auto mode — verify `pool.entered` response is returned
  - Test `pool.enter` in claim mode — verify `members$` is populated from response
  - Test `pool.matched` event — verify `matched$` emits with correct session name and peers
  - Test `pool.member.joined` / `pool.member.left` — verify `members$` updates
  - Test `pool.claim` — verify frame sent correctly and response returned
  - Test `pool.accept` / `pool.reject` in propose mode — verify frames sent
  - Test `pool.assign` in delegated mode — verify `pool.assign` frame and `pool.assigned` response
  - Test `pool.leave` — verify frame sent with correct pool name

## Acceptance Criteria

- All five pool modes (`auto`, `claim`, `mutual`, `propose`, `delegated`) are supported per protocol spec section 7
- `pool.enter` sends the correct frame and returns `pool.entered`; in claim-based modes `members$` is populated from the response member list
- `pool.matched` events cause `matched$` to emit with the session name and peer list
- `pool.member.joined` and `pool.member.left` events update `members$` in real time (claim-based and delegated modes)
- `pool.claim`, `pool.accept`, `pool.reject`, and `pool.assign` send correct frames and surface server responses
- Auto mode filter fields (`attributes`, `filter` with literal values and `@self` references) are passed through to the server without client-side validation
- `Pool` module follows the same file-per-responsibility pattern as `Session.swift`, `Presence.swift`, and `DataModule.swift`
- New types are added to `Types.swift`, keeping `Pool.swift` focused on behavior
- Unit tests cover all public operations using the mock WebSocket transport pattern already used in the test suite
