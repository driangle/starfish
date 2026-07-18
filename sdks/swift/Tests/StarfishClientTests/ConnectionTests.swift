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
        XCTAssertEqual(welcome.header.resource, "client")
        XCTAssertEqual(welcome.header.method, "welcome")

        // Verify hello was sent
        let helloFrame = mock.sentFrames.first { $0.header.resource == "client" && $0.header.method == "hello" }
        XCTAssertNotNil(helloFrame)
        XCTAssertEqual(helloFrame?.header.kind, .request)
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
        let frame = StarfishFrame(
            header: StarfishHeader(id: "test_1", resource: "test", method: "test", kind: .request)
        )
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
                header: StarfishHeader(
                    id: "resp_1",
                    resource: "session",
                    method: "joined",
                    kind: .response,
                    replyTo: "join_2"
                ),
                payload: ["clients": AnyCodable([] as [Any])]
            ))
        }

        let response = try await conn.sendAndWait(StarfishFrame(
            header: StarfishHeader(id: "join_2", resource: "session", method: "join", kind: .request)
        ))

        XCTAssertEqual(response.header.method, "joined")
    }

    func testFrameDispatch() async throws {
        let (conn, mock) = makeMockConnection()
        try await conn.connect()

        let received = Collected<StarfishFrame>()
        let unsub = conn.frames$.subscribe { received.append($0) }

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "msg_1",
                resource: "topic",
                method: "message",
                kind: .event,
                topic: "chat"
            ),
            payload: ["data": AnyCodable("hello")]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.count, 1)
        XCTAssertEqual(received.first?.header.resource, "topic")
        XCTAssertEqual(received.first?.header.method, "message")
        unsub()
    }
}
