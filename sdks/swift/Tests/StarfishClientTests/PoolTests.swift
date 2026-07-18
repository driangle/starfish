import XCTest
@testable import StarfishClient

final class PoolTests: XCTestCase {

    /// Creates a connected StarfishClient and joins a session, ready for pool tests.
    private func makeClient() async throws -> (StarfishClient, MockWebSocketTransport) {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let client = StarfishClient(options: options)
        try await client.connect()

        // Auto-respond to join
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let joinFrame = mock.sentFrames.first { $0.header.resource == "session" && $0.header.method == "join" }
            if let id = joinFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "join_resp", resource: "session", method: "joined", kind: .response,
                        session: "room-1", replyTo: id
                    ),
                    payload: ["clients": AnyCodable([["id": "test-client-id", "name": "me"]] as [[String: Any]])]
                ))
            }
        }
        try await client.join(session: "room-1")

        return (client, mock)
    }

    /// Helper to enter a pool with auto-response.
    private func enterPool(
        _ client: StarfishClient,
        mock: MockWebSocketTransport,
        pool poolName: String = "lobby",
        options: PoolEnterOptions = PoolEnterOptions(groupSize: 2),
        responsePayload: [String: AnyCodable]? = nil
    ) async throws {
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let enterFrame = mock.sentFrames.first { $0.header.resource == "pool" && $0.header.method == "enter" }
            if let id = enterFrame?.header.id {
                let payload = responsePayload ?? ["pool": AnyCodable(poolName)]
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "pool_resp", resource: "pool", method: "entered", kind: .response,
                        replyTo: id
                    ),
                    payload: payload
                ))
            }
        }
        try await client.enterPool(options, pool: poolName)
    }

    // MARK: - enter

    func testEnterAutoMode() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let enterFrame = mock.sentFrames.first { $0.header.resource == "pool" && $0.header.method == "enter" }
            if let id = enterFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "pool_resp", resource: "pool", method: "entered", kind: .response,
                        replyTo: id
                    ),
                    payload: [
                        "pool": AnyCodable("lobby"),
                        "mode": AnyCodable("auto"),
                        "groupSize": AnyCodable(2),
                    ]
                ))
            }
        }

        let response = try await client.enterPool(
            PoolEnterOptions(groupSize: 2),
            pool: "lobby"
        )

        XCTAssertEqual(response.header.method, "entered")

        let poolFrames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "enter" }
        XCTAssertEqual(poolFrames.count, 1)
        XCTAssertEqual(poolFrames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(poolFrames[0].payloadInt("groupSize"), 2)
    }

    func testEnterClaimModePopulatesMembers() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let enterFrame = mock.sentFrames.first { $0.header.resource == "pool" && $0.header.method == "enter" }
            if let id = enterFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "pool_resp", resource: "pool", method: "entered", kind: .response,
                        replyTo: id
                    ),
                    payload: [
                        "pool": AnyCodable("lobby"),
                        "mode": AnyCodable("claim"),
                        "groupSize": AnyCodable(2),
                        "members": AnyCodable([
                            ["id": "alice", "attributes": ["mood": "calm"]],
                            ["id": "bob", "attributes": ["mood": "wild"]],
                        ] as [[String: Any]]),
                    ]
                ))
            }
        }

        try await client.enterPool(
            PoolEnterOptions(groupSize: 2, mode: .claim),
            pool: "lobby"
        )

        let members = client.pool.members$.value
        XCTAssertEqual(members.count, 2)
        let ids = Set(members.map(\.id))
        XCTAssertTrue(ids.contains("alice"))
        XCTAssertTrue(ids.contains("bob"))
    }

    // MARK: - matched

    func testMatchedEmitsOnPoolMatched() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: ["pool": AnyCodable("lobby")])

        let events = Collected<PoolMatchResult>()
        client.pool.matched$.subscribe { events.append($0) }

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "evt_1", resource: "pool", method: "matched", kind: .event
            ),
            payload: [
                "pool": AnyCodable("lobby"),
                "session": AnyCodable("dt-abc"),
                "peers": AnyCodable([
                    ["id": "me", "attributes": [:] as [String: Any]],
                    ["id": "alice", "attributes": [:] as [String: Any]],
                ] as [[String: Any]]),
            ]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(events.count, 1)
        XCTAssertEqual(events.first?.session, "dt-abc")
        XCTAssertEqual(events.first?.peers.count, 2)
    }

    // MARK: - member.joined / member.left

    func testMemberJoinedUpdatesMembersObservable() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: [
            "pool": AnyCodable("lobby"),
            "mode": AnyCodable("claim"),
            "groupSize": AnyCodable(2),
        ])

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "evt_1", resource: "pool", method: "member-joined", kind: .event
            ),
            payload: [
                "pool": AnyCodable("lobby"),
                "member": AnyCodable(["id": "alice", "attributes": ["mood": "calm"]] as [String: Any]),
            ]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        let members = client.pool.members$.value
        XCTAssertEqual(members.count, 1)
        XCTAssertEqual(members[0].id, "alice")
    }

    func testMemberLeftUpdatesMembersObservable() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: [
            "pool": AnyCodable("lobby"),
            "mode": AnyCodable("claim"),
            "groupSize": AnyCodable(2),
            "members": AnyCodable([["id": "alice"], ["id": "bob"]] as [[String: Any]]),
        ])

        XCTAssertEqual(client.pool.members$.value.count, 2)

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "evt_1", resource: "pool", method: "member-left", kind: .event
            ),
            payload: [
                "pool": AnyCodable("lobby"),
                "memberId": AnyCodable("alice"),
                "reason": AnyCodable("left"),
            ]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        let members = client.pool.members$.value
        XCTAssertEqual(members.count, 1)
        XCTAssertEqual(members[0].id, "bob")
    }

    // MARK: - claim

    func testClaimSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.pool.claim(pool: "lobby", target: "alice")
        try await Task.sleep(nanoseconds: 50_000_000)

        let claimFrames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "claim" }
        XCTAssertEqual(claimFrames.count, 1)
        XCTAssertEqual(claimFrames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(claimFrames[0].payloadString("target"), "alice")
    }

    // MARK: - accept / reject

    func testAcceptSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.pool.accept(pool: "lobby", from: "alice")
        try await Task.sleep(nanoseconds: 50_000_000)

        let frames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "accept" }
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(frames[0].payloadString("from"), "alice")
    }

    func testRejectSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.pool.reject(pool: "lobby", from: "alice")
        try await Task.sleep(nanoseconds: 50_000_000)

        let frames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "reject" }
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(frames[0].payloadString("from"), "alice")
    }

    // MARK: - assign

    func testAssignSendsFrameAndReturnsResponse() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let assignFrame = mock.sentFrames.first { $0.header.resource == "pool" && $0.header.method == "assign" }
            if let id = assignFrame?.header.id {
                mock.injectFrame(StarfishFrame(
                    header: StarfishHeader(
                        id: "assign_resp", resource: "pool", method: "assigned", kind: .response,
                        replyTo: id
                    ),
                    payload: [
                        "pool": AnyCodable("lobby"),
                        "matched": AnyCodable([["group": ["alice", "bob"], "session": "dt-abc"]] as [[String: Any]]),
                    ]
                ))
            }
        }

        let response = try await client.pool.assign(pool: "lobby", groups: [["alice", "bob"]])
        XCTAssertEqual(response.header.method, "assigned")

        let assignFrames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "assign" }
        XCTAssertEqual(assignFrames.count, 1)
        XCTAssertEqual(assignFrames[0].payloadString("pool"), "lobby")
    }

    // MARK: - leave

    func testLeaveSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.leavePool("lobby")
        try await Task.sleep(nanoseconds: 50_000_000)

        let frames = mock.sentFrames.filter { $0.header.resource == "pool" && $0.header.method == "leave" }
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].payloadString("pool"), "lobby")
    }

    // MARK: - proposals / claimRejected

    func testProposalEmitsOnPoolProposal() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: ["pool": AnyCodable("lobby")])

        let proposals = Collected<StarfishFrame>()
        client.pool.proposals$.subscribe { proposals.append($0) }

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "evt_1", resource: "pool", method: "proposal", kind: .event
            ),
            payload: [
                "pool": AnyCodable("lobby"),
                "from": AnyCodable("alice"),
                "attributes": AnyCodable(["mood": "calm"] as [String: Any]),
            ]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(proposals.count, 1)
        XCTAssertEqual(proposals.first?.payloadString("from"), "alice")
    }

    func testClaimRejectedEmits() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: ["pool": AnyCodable("lobby")])

        let rejections = Collected<StarfishFrame>()
        client.pool.claimRejected$.subscribe { rejections.append($0) }

        mock.injectFrame(StarfishFrame(
            header: StarfishHeader(
                id: "evt_1", resource: "pool", method: "claim-rejected", kind: .event
            ),
            payload: [
                "pool": AnyCodable("lobby"),
                "target": AnyCodable("bob"),
            ]
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(rejections.count, 1)
        XCTAssertEqual(rejections.first?.payloadString("target"), "bob")
    }
}
