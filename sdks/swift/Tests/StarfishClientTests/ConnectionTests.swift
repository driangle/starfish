import XCTest
@testable import StarfishClient

final class ConnectionTests: XCTestCase {

    func makeMockConnection() -> (Connection, MockWebSocketTransport) {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        return (Connection(options: options), mock)
    }

    func testConnectSendsHelloAndReceivesWelcome() async throws {
        let (conn, mock) = makeMockConnection()

        let welcome = try await conn.connect()

        XCTAssertEqual(conn.state$.value, .connected)
        XCTAssertEqual(conn.clientId, "test-client-id")
        XCTAssertEqual(welcome.type, "server.welcome")

        // Verify hello was sent
        let helloFrame = mock.sentFrames.first { $0.type == "client.hello" }
        XCTAssertNotNil(helloFrame)
    }

    func testDisconnectSetsState() async throws {
        let (conn, _) = makeMockConnection()
        try await conn.connect()
        XCTAssertEqual(conn.state$.value, .connected)

        conn.disconnect()
        XCTAssertEqual(conn.state$.value, .disconnected)
    }

    func testSendThrowsWhenNotConnected() {
        let (conn, _) = makeMockConnection()
        let frame = StarfishFrame(id: "test_1", type: "test")
        XCTAssertThrowsError(try conn.send(frame)) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .notConnected)
        }
    }

    func testSendAndWait() async throws {
        let (conn, mock) = makeMockConnection()
        try await conn.connect()

        // Set up a task to respond to the request
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            mock.injectFrame(StarfishFrame(
                id: "resp_1",
                type: "session.joined",
                replyTo: "join_2",
                payload: AnyCodable(["clients": []] as [String: Any])
            ))
        }

        let response = try await conn.sendAndWait(StarfishFrame(
            id: "join_2",
            type: "session.join"
        ))

        XCTAssertEqual(response.type, "session.joined")
    }

    func testFrameDispatch() async throws {
        let (conn, mock) = makeMockConnection()
        try await conn.connect()

        let received = Collected<StarfishFrame>()
        let unsub = conn.frames$.subscribe { received.append($0) }

        mock.injectFrame(StarfishFrame(
            id: "msg_1",
            type: "topic.message",
            topic: "chat",
            payload: "hello"
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.count, 1)
        XCTAssertEqual(received.first?.type, "topic.message")
        unsub()
    }
}
