import Foundation

/// Thread-safe frame ID generator producing sequential IDs like "hello_1", "join_2".
final class FrameIDGenerator: @unchecked Sendable {
    private var counter: Int = 0
    private let lock = NSLock()

    func nextId(prefix: String = "msg") -> String {
        lock.lock()
        defer { lock.unlock() }
        counter += 1
        return "\(prefix)_\(counter)"
    }

    func reset() {
        lock.lock()
        defer { lock.unlock() }
        counter = 0
    }
}
