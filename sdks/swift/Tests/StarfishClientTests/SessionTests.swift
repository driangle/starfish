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
            // Find the join frame ID
            let joinFrame = mock.sentFrames.first { $0.type == "session.join" }
            if let id = joinFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "resp",
                    type: "session.joined",
                    session: "test-room",
                    replyTo: id,
                    payload: AnyCodable([
                        "clients": [
                            ["id": "test-client-id", "name": "me"],
                            ["id": "peer-1", "name": "peer"],
                        ]
                    ] as [String: Any])
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
            let joinFrame = mock.sentFrames.first { $0.type == "session.join" }
            if let id = joinFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "resp",
                    type: "session.joined",
                    session: "room",
                    replyTo: id,
                    payload: AnyCodable(["clients": [["id": "test-client-id", "name": "me"]]] as [String: Any])
                ))
            }
        }
        _ = try await session.join(session: "room")

        // Simulate client.connected
        session.handleFrame(StarfishFrame(
            id: "notify_1",
            type: "client.connected",
            session: "room",
            payload: AnyCodable(["client": ["id": "new-peer", "name": "newcomer"]] as [String: Any])
        ))

        XCTAssertEqual(session.clients$.value.count, 2)
    }

    func testHandleClientDisconnected() async throws {
        let (_, mock, session) = try await makeConnectedSetup()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.type == "session.join" }
            if let id = joinFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "resp",
                    type: "session.joined",
                    session: "room",
                    replyTo: id,
                    payload: AnyCodable(["clients": [
                        ["id": "test-client-id", "name": "me"],
                        ["id": "peer-1", "name": "peer"],
                    ]] as [String: Any])
                ))
            }
        }
        _ = try await session.join(session: "room")
        XCTAssertEqual(session.clients$.value.count, 2)

        session.handleFrame(StarfishFrame(
            id: "notify_2",
            type: "client.disconnected",
            session: "room",
            payload: AnyCodable(["clientId": "peer-1"] as [String: Any])
        ))

        XCTAssertEqual(session.clients$.value.count, 1)
    }
}
