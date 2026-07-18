import Foundation

/// Manages client presence: setting own presence and observing peers.
public final class Presence: @unchecked Sendable {
    private let connection: Connection
    private let session: Session
    private var presenceMap: [String: AnyCodable] = [:]

    public let presence$ = Observable<[String: AnyCodable]>([:])

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    public func set(_ payload: AnyCodable) throws {
        let sessionName = try session.require()

        let json = try encodePayload(payload)
        try validatePayloadSize(json, limit: Limits.maxPresenceSize, label: "Presence payload")

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "pres"),
                resource: "presence",
                method: "set",
                kind: .request,
                session: sessionName
            ),
            payload: ["data": payload]
        )

        try connection.send(frame)
    }

    func handleFrame(_ frame: StarfishFrame) {
        guard frame.header.resource == "presence" && frame.header.method == "updated" else { return }
        guard let from = frame.header.from else { return }
        if let data = frame.payload?["data"] {
            presenceMap[from] = data
        } else {
            presenceMap[from] = AnyCodable(frame.payload as Any)
        }
        presence$.set(presenceMap)
    }

    func clear() {
        presenceMap.removeAll()
        presence$.set([:])
    }
}
