import Foundation
@testable import StarfishClient

/// Mock WebSocket transport for testing.
/// Queues outgoing messages and allows injecting incoming messages.
final class MockWebSocketTransport: WebSocketTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var sentMessages: [String] = []
    private var receiveQueue: [String] = []
    private var receiveContinuation: CheckedContinuation<String, Error>?
    private var _isClosed = false

    var isClosed: Bool {
        lock.lock()
        defer { lock.unlock() }
        return _isClosed
    }

    /// All messages sent via this transport.
    var sent: [String] {
        lock.lock()
        defer { lock.unlock() }
        return sentMessages
    }

    /// Decode sent messages as frames.
    var sentFrames: [StarfishFrame] {
        sent.compactMap { try? decodeFrame($0) }
    }

    func send(_ string: String) async throws {
        lock.lock()
        sentMessages.append(string)
        lock.unlock()

        // Auto-respond to handshake
        if let frame = try? decodeFrame(string),
           frame.header.resource == "client" && frame.header.method == "hello" {
            let response = StarfishFrame(
                header: StarfishHeader(
                    id: "welcome_1",
                    resource: "client",
                    method: "welcome",
                    kind: .response,
                    replyTo: frame.header.id
                ),
                payload: [
                    "clientId": AnyCodable("test-client-id"),
                    "resumeToken": AnyCodable("test-resume-token"),
                    "heartbeatInterval": AnyCodable(15000),
                    "serverTime": AnyCodable(Int(Date().timeIntervalSince1970 * 1000)),
                ]
            )
            let json = try! encodeFrame(response)
            inject(json)
        }
    }

    func receive() async throws -> String {
        return try await withCheckedThrowingContinuation { continuation in
            lock.lock()
            if !receiveQueue.isEmpty {
                let msg = receiveQueue.removeFirst()
                lock.unlock()
                continuation.resume(returning: msg)
            } else if _isClosed {
                lock.unlock()
                continuation.resume(throwing: StarfishError(code: .disconnected, message: "Connection closed"))
            } else {
                receiveContinuation = continuation
                lock.unlock()
            }
        }
    }

    func close(code: URLSessionWebSocketTask.CloseCode) async {
        lock.lock()
        _isClosed = true
        let cont = receiveContinuation
        receiveContinuation = nil
        lock.unlock()
        cont?.resume(throwing: StarfishError(code: .disconnected, message: "Connection closed"))
    }

    /// Inject a message as if received from the server.
    func inject(_ message: String) {
        lock.lock()
        if let cont = receiveContinuation {
            receiveContinuation = nil
            lock.unlock()
            cont.resume(returning: message)
        } else {
            receiveQueue.append(message)
            lock.unlock()
        }
    }

    /// Inject a frame as if received from the server.
    func injectFrame(_ frame: StarfishFrame) {
        if let json = try? encodeFrame(frame) {
            inject(json)
        }
    }

    /// Reset sent messages.
    func reset() {
        lock.lock()
        sentMessages.removeAll()
        lock.unlock()
    }
}
