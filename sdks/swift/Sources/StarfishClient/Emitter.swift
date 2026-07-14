import Foundation

/// Callback-based unsubscribe token.
public typealias Unsubscribe = @Sendable () -> Void

// MARK: - Observable<T>

/// Stateful value holder that notifies subscribers on changes.
/// Produces `AsyncStream<T>` for consumers.
///
/// Not thread-safe on its own — designed to be used within an actor's isolation.
public final class Observable<T: Sendable>: @unchecked Sendable {
    private var current: T
    private var continuations: [UUID: AsyncStream<T>.Continuation] = [:]
    private let lock = NSLock()

    public init(_ initial: T) {
        self.current = initial
    }

    public var value: T {
        lock.lock()
        defer { lock.unlock() }
        return current
    }

    public func set(_ value: T) {
        lock.lock()
        current = value
        let conts = continuations
        lock.unlock()
        for (_, cont) in conts {
            cont.yield(value)
        }
    }

    /// Returns an AsyncStream that yields every time the value changes.
    public var stream: AsyncStream<T> {
        let id = UUID()
        return AsyncStream { continuation in
            self.lock.lock()
            self.continuations[id] = continuation
            self.lock.unlock()
            continuation.onTermination = { @Sendable _ in
                self.lock.lock()
                self.continuations.removeValue(forKey: id)
                self.lock.unlock()
            }
        }
    }

    /// Subscribe with a callback. Returns an unsubscribe closure.
    @discardableResult
    public func subscribe(_ callback: @escaping @Sendable (T) -> Void) -> Unsubscribe {
        let stream = self.stream
        let task = Task {
            for await value in stream {
                callback(value)
            }
        }
        return { task.cancel() }
    }
}

// MARK: - EventStream<T>

/// Stateless event emitter.
/// Produces `AsyncStream<T>` for consumers.
public final class EventStream<T: Sendable>: @unchecked Sendable {
    private var continuations: [UUID: AsyncStream<T>.Continuation] = [:]
    private let lock = NSLock()

    public init() {}

    public func emit(_ value: T) {
        lock.lock()
        let conts = continuations
        lock.unlock()
        for (_, cont) in conts {
            cont.yield(value)
        }
    }

    /// Returns an AsyncStream that yields every emitted value.
    public var stream: AsyncStream<T> {
        let id = UUID()
        return AsyncStream { continuation in
            self.lock.lock()
            self.continuations[id] = continuation
            self.lock.unlock()
            continuation.onTermination = { @Sendable _ in
                self.lock.lock()
                self.continuations.removeValue(forKey: id)
                self.lock.unlock()
            }
        }
    }

    /// Subscribe with a callback. Returns an unsubscribe closure.
    @discardableResult
    public func subscribe(_ callback: @escaping @Sendable (T) -> Void) -> Unsubscribe {
        let stream = self.stream
        let task = Task {
            for await value in stream {
                callback(value)
            }
        }
        return { task.cancel() }
    }
}
