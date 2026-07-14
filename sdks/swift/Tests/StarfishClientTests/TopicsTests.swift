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
            let joinFrame = mock.sentFrames.first { $0.type == "session.join" }
            if let id = joinFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "resp", type: "session.joined", session: "room", replyTo: id,
                    payload: AnyCodable(["clients": []] as [String: Any])
                ))
            }
        }
        _ = try await session.join(session: "room")

        // Subscribe
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let subFrame = mock.sentFrames.first { $0.type == "topic.subscribe" }
            if let id = subFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "resp2", type: "topic.subscribed", topic: "chat", replyTo: id
                ))
            }
        }
        _ = try await topics.subscribe(topic: "chat")

        // Listen for messages
        let received = Collected<StarfishFrame>()
        let unsub = topics.topic$("chat").subscribe { received.append($0) }

        // Simulate incoming message
        topics.handleFrame(StarfishFrame(
            id: "msg_1", type: "topic.message", topic: "chat",
            payload: AnyCodable("hello")
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
            id: "tp_1", type: "topic.peers", topic: "chat",
            payload: AnyCodable(["subscribers": ["a", "b", "c"]] as [String: Any])
        ))

        XCTAssertEqual(topics.getTopicPeers("chat").sorted(), ["a", "b", "c"])
    }
}
