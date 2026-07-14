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
            id: connection.idGen.nextId(prefix: "join"),
            type: "session.join",
            session: session,
            payload: AnyCodable([
                "create": options?.create ?? true,
                "name": options?.name ?? connection.clientId ?? "client",
                "role": options?.role ?? "default",
                "meta": options?.meta?.mapValues { $0.value } ?? [:],
            ] as [String: Any])
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
            id: connection.idGen.nextId(prefix: "leave"),
            type: "session.leave",
            session: session
        )

        try connection.send(frame)
        _session = nil
        _clients.removeAll()
        updateObservables()
    }

    func handleFrame(_ frame: StarfishFrame) {
        guard let session = _session, frame.session == session else { return }

        switch frame.type {
        case "client.connected":
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
        case "client.disconnected":
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
