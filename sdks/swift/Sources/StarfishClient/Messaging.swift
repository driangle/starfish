import Foundation

/// Handles direct messaging and broadcasting.
final class Messaging: @unchecked Sendable {
    private let connection: Connection
    private let session: Session

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    func send(to: FrameTarget, payload: AnyCodable, options: FrameOptions? = nil) throws {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "send"),
            type: "client.send",
            session: sessionName,
            to: to,
            options: options,
            payload: payload
        )

        try connection.send(frame)
    }

    func broadcast(payload: AnyCodable, options: FrameOptions? = nil) throws {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "bcast"),
            type: "session.broadcast",
            session: sessionName,
            options: options,
            payload: payload
        )

        try connection.send(frame)
    }
}
