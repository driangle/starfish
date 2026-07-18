import Foundation

/// Tracks in-flight request/response pairs matched by frame ID.
final class PendingRequests: @unchecked Sendable {
    private var pending: [String: CheckedContinuation<StarfishFrame, Error>] = [:]
    private var timers: [String: Task<Void, Never>] = [:]
    private let lock = NSLock()

    /// Register a pending request and wait for its response.
    func add(messageId: String, timeout: TimeInterval = 10.0) async throws -> StarfishFrame {
        try await withCheckedThrowingContinuation { continuation in
            lock.lock()
            pending[messageId] = continuation
            let timer = Task {
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                self.lock.lock()
                if let cont = self.pending.removeValue(forKey: messageId) {
                    self.timers.removeValue(forKey: messageId)
                    self.lock.unlock()
                    cont.resume(throwing: StarfishError(
                        code: .requestTimeout,
                        message: "Request \(messageId) timed out after \(Int(timeout * 1000))ms"
                    ))
                } else {
                    self.lock.unlock()
                }
            }
            timers[messageId] = timer
            lock.unlock()
        }
    }

    /// Try to resolve a pending request with a received frame.
    /// Returns true if the frame was consumed as a response.
    func resolve(frame: StarfishFrame) -> Bool {
        guard let replyTo = frame.header.replyTo else { return false }

        lock.lock()
        guard let cont = pending.removeValue(forKey: replyTo) else {
            lock.unlock()
            return false
        }
        let timer = timers.removeValue(forKey: replyTo)
        lock.unlock()

        timer?.cancel()

        if frame.header.resource == "error" {
            let message = frame.payloadString("message") ?? "Server error"
            let code = frame.payloadString("code") ?? "SERVER_ERROR"
            let retry = frame.payload?["retry"]?.value as? Bool
            cont.resume(throwing: StarfishError(
                code: .serverError,
                message: message,
                resource: frame.header.resource,
                retry: retry,
                details: AnyCodable(["code": code] as [String: Any])
            ))
        } else {
            cont.resume(returning: frame)
        }

        return true
    }

    /// Reject all pending requests with the given error.
    func rejectAll(error: StarfishError) {
        lock.lock()
        let entries = pending
        pending.removeAll()
        let allTimers = timers
        timers.removeAll()
        lock.unlock()

        for (_, timer) in allTimers {
            timer.cancel()
        }
        for (_, cont) in entries {
            cont.resume(throwing: error)
        }
    }
}
