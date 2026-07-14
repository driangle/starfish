import Foundation

/// Thread-safe collection helper for tests.
final class Collected<T>: @unchecked Sendable {
    private var items: [T] = []
    private let lock = NSLock()

    var values: [T] {
        lock.lock()
        defer { lock.unlock() }
        return items
    }

    var count: Int {
        lock.lock()
        defer { lock.unlock() }
        return items.count
    }

    var first: T? {
        lock.lock()
        defer { lock.unlock() }
        return items.first
    }

    func append(_ item: T) {
        lock.lock()
        items.append(item)
        lock.unlock()
    }
}
