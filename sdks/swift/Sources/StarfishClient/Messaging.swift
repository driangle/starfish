import Foundation

/// Handles direct messaging and broadcasting.
final class Messaging: @unchecked Sendable {
    private let connection: Connection
    private let session: Session

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    func send(to: FrameTarget, payload: AnyCodable, options: HeaderOptions? = nil) throws {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "send"),
                resource: "message",
                method: "send",
                kind: .request,
                session: sessionName,
                to: to,
                delivery: options?.delivery,
                priority: options?.priority,
                ttl: options?.ttl,
                meta: options?.meta
            ),
            payload: ["data": payload]
        )

        try connection.send(frame)
    }

    func broadcast(payload: AnyCodable, options: HeaderOptions? = nil) throws {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "bcast"),
                resource: "session",
                method: "broadcast",
                kind: .request,
                session: sessionName,
                delivery: options?.delivery,
                priority: options?.priority,
                ttl: options?.ttl,
                meta: options?.meta
            ),
            payload: ["data": payload]
        )

        try connection.send(frame)
    }
}
