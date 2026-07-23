/**
 * Minimal, dependency-free reactive primitives.
 *
 * `Observable<T>` is BehaviorSubject-like (holds a current `.value`); `EventStream<T>`
 * is Subject-like (fire-and-forget). The `$` naming convention is borrowed from RxJS,
 * but these are intentionally NOT RxJS — only `subscribe()` (+ `value`/`set` on
 * `Observable`) exist, and streams never `complete`/`error`.
 *
 * For why the SDK stays lightweight instead of depending on RxJS — and a tiny adapter
 * to bridge these into real RxJS Observables — see docs/adr/0001-lightweight-reactive-primitives.md.
 */
export type Unsubscribe = () => void;

export class Observable<T> {
  private listeners = new Set<(value: T) => void>();
  private current: T;

  constructor(initial: T) {
    this.current = initial;
  }

  get value(): T {
    return this.current;
  }

  set(value: T): void {
    this.current = value;
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  subscribe(callback: (value: T) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export class EventStream<T> {
  private listeners = new Set<(value: T) => void>();

  emit(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  subscribe(callback: (value: T) => void): Unsubscribe {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}
