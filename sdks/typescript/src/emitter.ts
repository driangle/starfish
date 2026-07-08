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
