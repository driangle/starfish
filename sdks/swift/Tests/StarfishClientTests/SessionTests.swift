import XCTest
@testable import StarfishClient

final class SessionTests: XCTestCase {

    func makeConnectedSetup() async throws -> (Connection, MockWebSocketTransport, Session) {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        try await conn.connect()
        let session = Session(connection: conn)
        return (conn, mock, session)
    }

    func testJoinSetsSession() async throws {
        let (_, mock, session) = try await makeConnectedSetup()

        // Auto-respond to join
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp",
                        resource: "session",
                        method: "joined",
                        kind: .response,
                        session: "test-room",
                        replyTo: id
                    ),
                    payload: ["clients": AnyCodable([
                        ["id": "test-client-id", "name": "me"],
                        ["id": "peer-1", "name": "peer"],
                    ] as [[String: Any]])]
                ))
            }
        }

        _ = try await session.join(session: "test-room")
        XCTAssertEqual(session.current, "test-room")
        XCTAssertEqual(session.clients$.value.count, 2)
        XCTAssertEqual(session.peers$.value.count, 1)
    }

    func testRequireThrowsWithoutSession() {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)

        XCTAssertThrowsError(try session.require()) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .noSession)
        }
    }

    func testHandleClientConnected() async throws {
        let (_, mock, session) = try await makeConnectedSetup()

        // Join first
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp",
                        resource: "session",
                        method: "joined",
                        kind: .response,
                        session: "room",
                        replyTo: id
                    ),
                    payload: ["clients": AnyCodable([["id": "test-client-id", "name": "me"]] as [[String: Any]])]
                ))
            }
        }
        _ = try await session.join(session: "room")

        // Simulate client connected event
        session.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "notify_1",
                resource: "session",
                method: "connected",
                kind: .event,
                session: "room"
            ),
            payload: ["client": AnyCodable(["id": "new-peer", "name": "newcomer"] as [String: Any])]
        ))

        XCTAssertEqual(session.clients$.value.count, 2)
    }

    func testHandleClientDisconnected() async throws {
        let (_, mock, session) = try await makeConnectedSetup()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp",
                        resource: "session",
                        method: "joined",
                        kind: .response,
                        session: "room",
                        replyTo: id
                    ),
                    payload: ["clients": AnyCodable([
                        ["id": "test-client-id", "name": "me"],
                        ["id": "peer-1", "name": "peer"],
                    ] as [[String: Any]])]
                ))
            }
        }
        _ = try await session.join(session: "room")
        XCTAssertEqual(session.clients$.value.count, 2)

        session.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "notify_2",
                resource: "session",
                method: "disconnected",
                kind: .event,
                session: "room"
            ),
            payload: ["clientId": AnyCodable("peer-1")]
        ))

        XCTAssertEqual(session.clients$.value.count, 1)
    }
}
