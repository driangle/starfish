import XCTest
@testable import StarfishClient

final class TopicsTests: XCTestCase {

    func testTopicStreamEmitsOnMessage() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        try await conn.connect()
        let session = Session(connection: conn)
        let topics = Topics(connection: conn, session: session)

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

        // Subscribe
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let subFrame = mock.sentFrames.first { $0.header.resource == "topic" && $0.header.method == "subscribe" }
            if let id = subFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "resp2", resource: "topic", method: "subscribed", kind: .response,
                        topic: "chat", replyTo: id
                    )
                ))
            }
        }
        _ = try await topics.subscribe(topic: "chat")

        // Listen for messages
        let received = Collected<StarfishFrame>()
        let unsub = topics.topic$("chat").subscribe { received.append($0) }

        // Simulate incoming message
        topics.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "msg_1", resource: "topic", method: "message", kind: .event,
                topic: "chat"
            ),
            payload: ["data": AnyCodable("hello")]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.count, 1)
        unsub()
    }

    func testTopicPeersTracking() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)
        let topics = Topics(connection: conn, session: session)

        topics.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "tp_1", resource: "topic", method: "peers", kind: .event,
                topic: "chat"
            ),
            payload: ["subscribers": AnyCodable(["a", "b", "c"])]
        ))

        XCTAssertEqual(topics.getTopicPeers("chat").sorted(), ["a", "b", "c"])
    }
}
