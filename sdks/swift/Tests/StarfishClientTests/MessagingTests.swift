import XCTest
@testable import StarfishClient

final class MessagingTests: XCTestCase {

    func testSendCreatesCorrectFrame() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        try await conn.connect()
        let session = Session(connection: conn)
        let messaging = Messaging(connection: conn, session: session)

        // Join session
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp", resource: "session", method: "joined", kind: .response,
                        session: "room", replyTo: id
                    ),
                    payload: ["clients": AnyCodable([] as [Any])]
                ))
            }
        }
        _ = try await session.join(session: "room")
        mock.reset()

        try messaging.send(to: .single("peer-1"), payload: AnyCodable("hello"))

        try await Task.sleep(nanoseconds: 50_000_000)

        let sendFrame = mock.sentFrames.first { $0.header.resource == "message" && $0.header.method == "send" }
        XCTAssertNotNil(sendFrame)
        XCTAssertEqual(sendFrame?.header.to, .single("peer-1"))
    }

    func testBroadcastCreatesCorrectFrame() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        try await conn.connect()
        let session = Session(connection: conn)
        let messaging = Messaging(connection: conn, session: session)

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp", resource: "session", method: "joined", kind: .response,
                        session: "room", replyTo: id
                    ),
                    payload: ["clients": AnyCodable([] as [Any])]
                ))
            }
        }
        _ = try await session.join(session: "room")
        mock.reset()

        try messaging.broadcast(payload: AnyCodable("hey everyone"))

        try await Task.sleep(nanoseconds: 50_000_000)

        let bcastFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "broadcast" }
        XCTAssertNotNil(bcastFrame)
    }

    func testSendThrowsWithoutSession() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        try await conn.connect()
        let session = Session(connection: conn)
        let messaging = Messaging(connection: conn, session: session)

        XCTAssertThrowsError(try messaging.send(to: .single("p"), payload: "hi")) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .noSession)
        }
    }
}
