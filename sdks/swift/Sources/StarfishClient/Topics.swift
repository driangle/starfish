import Foundation

/// Manages topic subscriptions, publishing, and per-topic event streams.
final class Topics: @unchecked Sendable {
    private let connection: Connection
    private let session: Session
    private var topicStreams: [String: EventStream<StarfishFrame>] = [:]
    private var subscriptions: Set<String> = []
    private var topicPeers: [String: Set<String>] = [:]

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    func subscribe(topic: String, callback: (@Sendable (StarfishFrame) -> Void)? = nil) async throws -> StarfishFrame {
        try validateTopicName(topic)
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "sub"),
                resource: "topic",
                method: "subscribe",
                kind: .request,
                session: sessionName,
                topic: topic
            )
        )

        let response = try await connection.sendAndWait(frame)
        subscriptions.insert(topic)

        if let callback = callback {
            topic$(topic).subscribe(callback)
        }

        return response
    }

    func unsubscribe(topic: String) throws {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "unsub"),
                resource: "topic",
                method: "unsubscribe",
                kind: .request,
                session: sessionName,
                topic: topic
            )
        )

        try connection.send(frame)
        subscriptions.remove(topic)
        topicPeers.removeValue(forKey: topic)
    }

    func publish(topic: String, payload: AnyCodable, options: HeaderOptions? = nil) throws {
        try validateTopicName(topic)
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "pub"),
                resource: "topic",
                method: "publish",
                kind: .request,
                session: sessionName,
                topic: topic,
                delivery: options?.delivery,
                priority: options?.priority,
                ttl: options?.ttl,
                meta: options?.meta
            ),
            payload: ["data": payload]
        )

        try connection.send(frame)
    }

    func topic$(_ topic: String) -> EventStream<StarfishFrame> {
        if let existing = topicStreams[topic] {
            return existing
        }
        let stream = EventStream<StarfishFrame>()
        topicStreams[topic] = stream
        return stream
    }

    func getTopicPeers(_ topic: String) -> [String] {
        guard let peers = topicPeers[topic] else { return [] }
        return Array(peers)
    }

    func handleFrame(_ frame: StarfishFrame) {
        guard frame.header.resource == "topic" else { return }

        if frame.header.method == "peers", let topic = frame.header.topic {
            if let subscribers = frame.payloadValue("subscribers") as? [String] {
                topicPeers[topic] = Set(subscribers)
            }
            return
        }

        if frame.header.method == "message", let topic = frame.header.topic {
            if frame.header.delivery?.preferTransport == .rtc && !subscriptions.contains(topic) {
                return
            }
            topicStreams[topic]?.emit(frame)
        }
    }
}
