# ADR 0001: Lightweight reactive primitives instead of RxJS

- **Status:** Accepted
- **Date:** 2026-07-23
- **Applies to:** `src/emitter.ts` (`Observable<T>`, `EventStream<T>`) and all `$`-suffixed
  stream members across the SDK.

## Context

The SDK exposes reactive, subscribable values — connection state, incoming frames,
presence maps, data changes, pool membership, and so on. By convention these are named
with a trailing `$` (e.g. `changed$`, `state$`, `topic$(...)`) to signal "this is a
subscribable stream."

These streams are backed by two ~20-line classes in `src/emitter.ts`:

- **`Observable<T>`** — holds a current `.value` and notifies subscribers on `set()`.
  Comparable to an RxJS `BehaviorSubject`.
- **`EventStream<T>`** — fire-and-forget; no stored value. Comparable to an RxJS `Subject`.

Both expose the same `subscribe(cb) => unsubscribe` contract.

The obvious alternative is to depend on **RxJS** and expose real `Observable`s.

## Decision

**Keep the lightweight in-house primitives. Do not take a runtime dependency on RxJS.**

This is a client SDK that other applications install, so the cost of a dependency is
paid by every consumer. The reactive surface we actually need is small — essentially
`Subject` + `BehaviorSubject` — and our two classes cover it with **zero dependencies**.

## Rationale

**For staying lightweight:**

- **No dependency imposed on consumers.** RxJS is a non-trivial dependency with its own
  major-version churn (e.g. the v6→v7 operator/pipe migration). Every consumer would ship
  it whether or not they use reactive features. Our entire reactive layer is ~46 lines.
- **No peer-dependency / duplicate-copy trap.** Depending on RxJS risks version conflicts
  with a consumer's own RxJS, or two copies bundled at once. Owning the primitives avoids
  both.
- **Right-sized surface.** Our streams are `Subject`/`BehaviorSubject` in disguise. We'd
  use a tiny fraction of RxJS; shipping the whole library to get two classes is poor
  leverage.
- **Control over semantics.** We decide behaviors (e.g. whether `Observable.subscribe`
  replays the current value) without fighting a framework's opinions.

**What we knowingly give up:**

- **Operators.** No `map`/`filter`/`debounceTime`/`combineLatest`/`switchMap`/etc.
  Transformations are done at the call site or not at all. (`events$(filter)` in
  `events.ts` hand-rolls what `.pipe(filter(...))` would give for free — an accepted
  cost at the current scale.)
- **No `complete` / `error` channels.** Streams never terminate or error; teardown is
  manual. Operators that require termination (`toArray`, `last`, `reduce`) don't apply.
- **Less turnkey familiarity.** RxJS users must learn that `$` here means a minimal
  stream (`.subscribe()` / `.value`), not a full RxJS `Observable`.

## Consequences

- The `$` naming convention is borrowed from the RxJS/Angular ecosystem but the
  implementation is homegrown. This is intentional; see the note in `src/emitter.ts`.
- **RxJS interop stays easy and opt-in.** Because `subscribe` returns an unsubscribe
  function, a consumer can bridge to a real RxJS `Observable` with a tiny adapter:

  ```ts
  import { Observable as RxObservable } from "rxjs";

  // EventStream<T> (Subject-like)
  const toRx = <T>(s: { subscribe(cb: (v: T) => void): () => void }) =>
    new RxObservable<T>((sub) => s.subscribe((v) => sub.next(v)));

  // Observable<T> (BehaviorSubject-like — replay current value)
  const toRxBehavior = <T>(o: { value: T; subscribe(cb: (v: T) => void): () => void }) =>
    new RxObservable<T>((sub) => {
      sub.next(o.value);
      return o.subscribe((v) => sub.next(v));
    });
  ```

  If demand warrants, this can ship as an optional, separately-imported module (e.g.
  `@starfish/rxjs`) so it is tree-shaken away for consumers who don't use RxJS.

## Revisit if…

The SDK's **internal** logic starts needing real stream orchestration — reconnection with
backoff, racing signaling channels, debounced presence, multi-stream RTC negotiation. At
that point, adopt RxJS **internally** as a private implementation detail while continuing
to expose the thin `$` primitives, so consumers are unaffected.
