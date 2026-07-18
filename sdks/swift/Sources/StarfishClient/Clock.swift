import Foundation

/// Server time synchronization and scheduled callbacks.
public final class Clock: @unchecked Sendable {
    private let connection: Connection
    private var _offset: TimeInterval = 0

    static let defaultSampleCount = 5

    init(connection: Connection) {
        self.connection = connection
    }

    /// The computed offset between local time and server time (in milliseconds).
    public var offset: TimeInterval { _offset }

    /// Returns the estimated current server time (in ms since epoch).
    public func now() -> Int {
        Int(Date().timeIntervalSince1970 * 1000) + Int(_offset)
    }

    /// Synchronize with the server by taking multiple round-trip samples.
    /// Returns the computed offset in milliseconds.
    @discardableResult
    public func sync(samples: Int = 5) async throws -> TimeInterval {
        var offsets: [TimeInterval] = []

        for _ in 0..<samples {
            let t1 = Date().timeIntervalSince1970 * 1000

            let frame = StarfishFrame(
                header: StarfishHeader(
                    id: connection.idGen.nextId(prefix: "clock"),
                    resource: "clock",
                    method: "sync",
                    kind: .request,
                    ts: Int(t1)
                )
            )

            let response = try await connection.sendAndWait(frame)
            let t4 = Date().timeIntervalSince1970 * 1000

            if let serverTime = response.payloadInt("serverTime") {
                let rtt = t4 - t1
                let estimatedServerTime = Double(serverTime) + rtt / 2
                offsets.append(estimatedServerTime - t4)
            }
        }

        if !offsets.isEmpty {
            offsets.sort()
            _offset = offsets[offsets.count / 2]
        }

        return _offset
    }

    /// Schedule a callback to fire at a specific server time.
    @discardableResult
    public func at(serverTime: Int, callback: @escaping @Sendable () -> Void) -> Task<Void, Never> {
        let localTime = Double(serverTime) - _offset
        let delay = max(0, localTime - Date().timeIntervalSince1970 * 1000)
        return Task {
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000))
            guard !Task.isCancelled else { return }
            callback()
        }
    }
}
