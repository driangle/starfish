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
            id: connection.idGen.nextId(prefix: "pres"),
            type: "presence.set",
            session: sessionName,
            payload: payload
        )

        try connection.send(frame)
    }

    func handleFrame(_ frame: StarfishFrame) {
        if frame.type == "presence.updated", let from = frame.from {
            presenceMap[from] = frame.payload
            presence$.set(presenceMap)
        }
    }

    func clear() {
        presenceMap.removeAll()
        presence$.set([:])
    }
}
