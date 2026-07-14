import Foundation

/// Sends periodic ping frames to keep the connection alive.
final class Heartbeat: @unchecked Sendable {
    private let connection: Connection
    private var timer: Task<Void, Never>?

    init(connection: Connection) {
        self.connection = connection
    }

    func start() {
        stop()
        let interval = connection.heartbeatInterval
        let conn = connection
        timer = Task {
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(interval * 1_000_000_000))
                guard !Task.isCancelled else { return }
                let frame = StarfishFrame(
                    id: conn.idGen.nextId(prefix: "ping"),
                    type: "ping",
                    ts: Int(Date().timeIntervalSince1970 * 1000)
                )
                try? conn.send(frame)
            }
        }
    }

    func stop() {
        timer?.cancel()
        timer = nil
    }
}
