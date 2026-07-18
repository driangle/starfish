import Foundation

/// Manages session lifecycle: join, leave, and client/peer tracking.
final class Session: @unchecked Sendable {
    private let connection: Connection
    private var _session: String?
    private var _clients: [String: ClientInfo] = [:]

    let clients$ = Observable<[ClientInfo]>([])
    let peers$ = Observable<[ClientInfo]>([])

    init(connection: Connection) {
        self.connection = connection
    }

    var current: String? { _session }

    var clientId: String? { connection.clientId }

    func require() throws -> String {
        guard let session = _session else {
            throw StarfishError(code: .noSession, message: "Not in a session. Call join() first.")
        }
        return session
    }

    func join(session: String, options: JoinOptions? = nil) async throws -> StarfishFrame {
        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "join"),
                resource: "session",
                method: "join",
                kind: .request,
                session: session
            ),
            payload: [
                "create": AnyCodable(options?.create ?? true),
                "name": AnyCodable(options?.name ?? connection.clientId ?? "client"),
                "role": AnyCodable(options?.role ?? "default"),
                "meta": AnyCodable(options?.meta?.mapValues { $0.value } ?? [:] as [String: Any]),
            ]
        )

        let response = try await connection.sendAndWait(frame)
        _session = session

        _clients.removeAll()
        if let clients = response.payloadValue("clients") as? [[String: Any]] {
            for c in clients {
                if let id = c["id"] as? String {
                    let info = ClientInfo(
                        id: id,
                        name: c["name"] as? String,
                        role: c["role"] as? String
                    )
                    _clients[id] = info
                }
            }
        }
        updateObservables()

        return response
    }

    func leave() throws {
        guard let session = _session else { return }

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "leave"),
                resource: "session",
                method: "leave",
                kind: .request,
                session: session
            )
        )

        try connection.send(frame)
        _session = nil
        _clients.removeAll()
        updateObservables()
    }

    func handleFrame(_ frame: StarfishFrame) {
        guard let session = _session, frame.header.session == session else { return }
        guard frame.header.resource == "session" else { return }

        switch frame.header.method {
        case "connected":
            if let clientDict = frame.payloadValue("client") as? [String: Any],
               let id = clientDict["id"] as? String {
                let info = ClientInfo(
                    id: id,
                    name: clientDict["name"] as? String,
                    role: clientDict["role"] as? String
                )
                _clients[id] = info
                updateObservables()
            }
        case "disconnected":
            if let clientId = frame.payloadString("clientId") {
                _clients.removeValue(forKey: clientId)
                updateObservables()
            }
        default:
            break
        }
    }

    private func updateObservables() {
        let all = Array(_clients.values)
        clients$.set(all)
        peers$.set(all.filter { $0.id != clientId })
    }
}
