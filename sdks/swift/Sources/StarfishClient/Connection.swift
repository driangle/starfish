import Foundation

/// Default request timeout in seconds.
let defaultRequestTimeout: TimeInterval = 10.0

/// Manages WebSocket connection lifecycle, handshake, and reconnection.
public final class Connection: @unchecked Sendable {
    private let options: StarfishClientOptions
    private var ws: (any WebSocketTransport)?
    private let pending = PendingRequests()
    let idGen = FrameIDGenerator()
    private var reconnectAttempt = 0
    private var reconnectTask: Task<Void, Never>?
    private var receiveTask: Task<Void, Never>?
    private var intentionalClose = false

    // State from server.welcome
    public private(set) var clientId: String?
    private var resumeToken: String?
    public private(set) var heartbeatInterval: TimeInterval = 15.0
    private var serverTime: Int?

    public let state$ = Observable<ConnectionState>(.disconnected)
    public let frames$ = EventStream<StarfishFrame>()

    public init(options: StarfishClientOptions) {
        self.options = options
    }

    @discardableResult
    public func connect() async throws -> StarfishFrame {
        intentionalClose = false
        state$.set(.connecting)

        ws = createWebSocket()

        // Start receive loop
        startReceiveLoop()

        // Perform handshake
        do {
            let welcome = try await doHandshake()
            return welcome
        } catch {
            state$.set(.disconnected)
            receiveTask?.cancel()
            receiveTask = nil
            throw error
        }
    }

    public func disconnect() {
        intentionalClose = true
        cancelReconnect()
        pending.rejectAll(error: StarfishError(code: .disconnected, message: "Client disconnected"))
        receiveTask?.cancel()
        receiveTask = nil

        if let ws = ws {
            Task {
                await ws.close(code: .normalClosure)
            }
            self.ws = nil
        }

        state$.set(.disconnected)
    }

    public func send(_ frame: StarfishFrame) throws {
        guard let ws = ws else {
            throw StarfishError(code: .notConnected, message: "Not connected")
        }
        let json = try encodeFrame(frame)
        Task {
            try? await ws.send(json)
        }
    }

    public func sendAndWait(_ frame: StarfishFrame, timeout: TimeInterval = 10.0) async throws -> StarfishFrame {
        let promise = Task {
            try await pending.add(messageId: frame.header.id, timeout: timeout)
        }
        try send(frame)
        return try await promise.value
    }

    // MARK: - Private

    private func createWebSocket() -> any WebSocketTransport {
        if let factory = options.webSocketFactory {
            return factory(options.server)
        }
        return URLSessionWebSocketTransport(url: options.server)
    }

    private func startReceiveLoop() {
        receiveTask?.cancel()
        receiveTask = Task { [weak self] in
            guard let self = self, let ws = self.ws else { return }
            while !Task.isCancelled {
                do {
                    let text = try await ws.receive()
                    let frame = try decodeFrame(text)
                    if !self.pending.resolve(frame: frame) {
                        self.frames$.emit(frame)
                    }
                } catch {
                    if !Task.isCancelled {
                        self.handleClose()
                    }
                    return
                }
            }
        }
    }

    private func doHandshake() async throws -> StarfishFrame {
        let hello = StarfishFrame(
            header: StarfishHeader(
                v: 1,
                id: idGen.nextId(prefix: "hello"),
                resource: "client",
                method: "hello",
                kind: .request,
                ts: Int(Date().timeIntervalSince1970 * 1000)
            ),
            payload: buildHelloPayload()
        )

        let welcome = try await sendAndWait(hello)

        clientId = welcome.payloadString("clientId")
        resumeToken = welcome.payloadString("resumeToken")
        if let hbInterval = welcome.payloadInt("heartbeatInterval") {
            heartbeatInterval = TimeInterval(hbInterval) / 1000.0
        }
        serverTime = welcome.payloadInt("serverTime")
        reconnectAttempt = 0
        state$.set(.connected)

        return welcome
    }

    private func buildHelloPayload() -> [String: AnyCodable] {
        let capabilities: [String: Any] = ["rtc": false]

        if let token = resumeToken {
            return [
                "versions": AnyCodable([1]),
                "resumeToken": AnyCodable(token),
                "capabilities": AnyCodable(capabilities),
            ]
        }

        var payload: [String: AnyCodable] = [
            "versions": AnyCodable([1]),
            "client": AnyCodable([
                "name": options.client?.name ?? "starfish-client",
                "role": options.client?.role ?? "default",
                "meta": options.client?.meta?.mapValues { $0.value } ?? [:],
            ] as [String: Any]),
            "capabilities": AnyCodable(capabilities),
        ]

        if let auth = options.auth {
            payload["auth"] = AnyCodable(["type": auth.type, "token": auth.token as Any] as [String: Any])
        } else {
            payload["auth"] = AnyCodable(["type": "none"] as [String: Any])
        }

        return payload
    }

    private func handleClose() {
        ws = nil
        receiveTask?.cancel()
        receiveTask = nil

        if intentionalClose {
            state$.set(.disconnected)
            return
        }

        pending.rejectAll(error: StarfishError(code: .connectionFailed, message: "Connection lost"))
        scheduleReconnect()
    }

    private func scheduleReconnect() {
        let opts = options.reconnect ?? .defaults

        if !opts.enabled || reconnectAttempt >= opts.maxRetries {
            state$.set(.disconnected)
            return
        }

        state$.set(.reconnecting)

        let delay = min(
            opts.baseDelay * pow(2.0, Double(reconnectAttempt)) + Double.random(in: 0...opts.baseDelay),
            opts.maxDelay
        )
        reconnectAttempt += 1

        reconnectTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            guard !Task.isCancelled else { return }
            do {
                try await self?.connect()
            } catch {
                // handleClose will schedule the next attempt
            }
        }
    }

    private func cancelReconnect() {
        reconnectTask?.cancel()
        reconnectTask = nil
    }
}
