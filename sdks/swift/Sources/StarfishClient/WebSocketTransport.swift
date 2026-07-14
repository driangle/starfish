import Foundation

/// Protocol abstracting WebSocket connections for testability and platform flexibility.
public protocol WebSocketTransport: Sendable {
    func send(_ string: String) async throws
    func receive() async throws -> String
    func close(code: URLSessionWebSocketTask.CloseCode) async
}

/// Default WebSocket transport using URLSessionWebSocketTask (Apple platforms).
public final class URLSessionWebSocketTransport: WebSocketTransport, @unchecked Sendable {
    private let task: URLSessionWebSocketTask
    private let session: URLSession

    public init(url: URL, session: URLSession = .shared) {
        self.session = session
        self.task = session.webSocketTask(with: url)
        self.task.resume()
    }

    public func send(_ string: String) async throws {
        try await task.send(.string(string))
    }

    public func receive() async throws -> String {
        let message = try await task.receive()
        switch message {
        case .string(let text):
            return text
        case .data(let data):
            guard let text = String(data: data, encoding: .utf8) else {
                throw StarfishError(code: .validationError, message: "Received non-UTF8 WebSocket data")
            }
            return text
        @unknown default:
            throw StarfishError(code: .validationError, message: "Unknown WebSocket message type")
        }
    }

    public func close(code: URLSessionWebSocketTask.CloseCode = .normalClosure) async {
        task.cancel(with: code, reason: nil)
    }
}
