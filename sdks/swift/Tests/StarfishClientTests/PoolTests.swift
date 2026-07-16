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
            let joinFrame = mock.sentFrames.first { $0.type == "session.join" }
            if let id = joinFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "join_resp", type: "session.joined", session: "room-1",
                    replyTo: id,
                    payload: AnyCodable(["clients": [["id": "test-client-id", "name": "me"]]] as [String: Any])
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
        responsePayload: [String: Any]? = nil
    ) async throws {
        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let enterFrame = mock.sentFrames.first { $0.type == "pool.enter" }
            if let id = enterFrame?.id {
                let payload = responsePayload ?? ["pool": poolName]
                mock.injectFrame(StarfishFrame(
                    id: "pool_resp", type: "pool.entered",
                    replyTo: id,
                    payload: AnyCodable(payload)
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
            let enterFrame = mock.sentFrames.first { $0.type == "pool.enter" }
            if let id = enterFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "pool_resp", type: "pool.entered",
                    replyTo: id,
                    payload: AnyCodable(["pool": "lobby", "mode": "auto", "groupSize": 2] as [String: Any])
                ))
            }
        }

        let response = try await client.enterPool(
            PoolEnterOptions(groupSize: 2),
            pool: "lobby"
        )

        XCTAssertEqual(response.type, "pool.entered")

        let poolFrames = mock.sentFrames.filter { $0.type == "pool.enter" }
        XCTAssertEqual(poolFrames.count, 1)
        XCTAssertEqual(poolFrames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(poolFrames[0].payloadInt("groupSize"), 2)
    }

    func testEnterClaimModePopulatesMembers() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        Task {
            try? await Task.sleep(nanoseconds: 50_000_000)
            let enterFrame = mock.sentFrames.first { $0.type == "pool.enter" }
            if let id = enterFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "pool_resp", type: "pool.entered",
                    replyTo: id,
                    payload: AnyCodable([
                        "pool": "lobby",
                        "mode": "claim",
                        "groupSize": 2,
                        "members": [
                            ["id": "alice", "attributes": ["mood": "calm"]],
                            ["id": "bob", "attributes": ["mood": "wild"]],
                        ],
                    ] as [String: Any])
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

        try await enterPool(client, mock: mock, responsePayload: ["pool": "lobby"] as [String: Any])

        let events = Collected<PoolMatchResult>()
        client.pool.matched$.subscribe { events.append($0) }

        mock.injectFrame(StarfishFrame(
            id: "evt_1", type: "pool.matched",
            payload: AnyCodable([
                "pool": "lobby",
                "session": "dt-abc",
                "peers": [
                    ["id": "me", "attributes": [:] as [String: Any]],
                    ["id": "alice", "attributes": [:] as [String: Any]],
                ],
            ] as [String: Any])
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
            "pool": "lobby", "mode": "claim", "groupSize": 2,
        ] as [String: Any])

        mock.injectFrame(StarfishFrame(
            id: "evt_1", type: "pool.member.joined",
            payload: AnyCodable([
                "pool": "lobby",
                "member": ["id": "alice", "attributes": ["mood": "calm"]],
            ] as [String: Any])
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
            "pool": "lobby",
            "mode": "claim",
            "groupSize": 2,
            "members": [["id": "alice"], ["id": "bob"]],
        ] as [String: Any])

        XCTAssertEqual(client.pool.members$.value.count, 2)

        mock.injectFrame(StarfishFrame(
            id: "evt_1", type: "pool.member.left",
            payload: AnyCodable(["pool": "lobby", "memberId": "alice", "reason": "left"] as [String: Any])
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

        let claimFrames = mock.sentFrames.filter { $0.type == "pool.claim" }
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

        let frames = mock.sentFrames.filter { $0.type == "pool.accept" }
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].payloadString("pool"), "lobby")
        XCTAssertEqual(frames[0].payloadString("from"), "alice")
    }

    func testRejectSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.pool.reject(pool: "lobby", from: "alice")
        try await Task.sleep(nanoseconds: 50_000_000)

        let frames = mock.sentFrames.filter { $0.type == "pool.reject" }
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
            let assignFrame = mock.sentFrames.first { $0.type == "pool.assign" }
            if let id = assignFrame?.id {
                mock.injectFrame(StarfishFrame(
                    id: "assign_resp", type: "pool.assigned",
                    replyTo: id,
                    payload: AnyCodable([
                        "pool": "lobby",
                        "matched": [["group": ["alice", "bob"], "session": "dt-abc"]],
                    ] as [String: Any])
                ))
            }
        }

        let response = try await client.pool.assign(pool: "lobby", groups: [["alice", "bob"]])
        XCTAssertEqual(response.type, "pool.assigned")

        let assignFrames = mock.sentFrames.filter { $0.type == "pool.assign" }
        XCTAssertEqual(assignFrames.count, 1)
        XCTAssertEqual(assignFrames[0].payloadString("pool"), "lobby")
    }

    // MARK: - leave

    func testLeaveSendsCorrectFrame() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try client.leavePool("lobby")
        try await Task.sleep(nanoseconds: 50_000_000)

        let frames = mock.sentFrames.filter { $0.type == "pool.leave" }
        XCTAssertEqual(frames.count, 1)
        XCTAssertEqual(frames[0].payloadString("pool"), "lobby")
    }

    // MARK: - proposals / claimRejected

    func testProposalEmitsOnPoolProposal() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: ["pool": "lobby"] as [String: Any])

        let proposals = Collected<StarfishFrame>()
        client.pool.proposals$.subscribe { proposals.append($0) }

        mock.injectFrame(StarfishFrame(
            id: "evt_1", type: "pool.proposal",
            payload: AnyCodable([
                "pool": "lobby",
                "from": "alice",
                "attributes": ["mood": "calm"],
            ] as [String: Any])
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(proposals.count, 1)
        XCTAssertEqual(proposals.first?.payloadString("from"), "alice")
    }

    func testClaimRejectedEmits() async throws {
        let (client, mock) = try await makeClient()
        mock.reset()

        try await enterPool(client, mock: mock, responsePayload: ["pool": "lobby"] as [String: Any])

        let rejections = Collected<StarfishFrame>()
        client.pool.claimRejected$.subscribe { rejections.append($0) }

        mock.injectFrame(StarfishFrame(
            id: "evt_1", type: "pool.claim.rejected",
            payload: AnyCodable(["pool": "lobby", "target": "bob"] as [String: Any])
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(rejections.count, 1)
        XCTAssertEqual(rejections.first?.payloadString("target"), "bob")
    }
}
