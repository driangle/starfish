import Foundation

/// Manages pool matchmaking: entering/leaving pools, claiming, proposing, and assigning.
public final class Pool: @unchecked Sendable {
    private let connection: Connection
    private let session: Session
    private var currentPool: String?
    private var membersMap: [String: PoolMember] = [:]

    public let members$ = Observable<[PoolMember]>([])
    public let matched$ = EventStream<PoolMatchResult>()
    public let proposals$ = EventStream<StarfishFrame>()
    public let claimRejected$ = EventStream<StarfishFrame>()

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    /// Enter a matchmaking pool.
    @discardableResult
    public func enter(_ options: PoolEnterOptions, pool poolName: String) async throws -> StarfishFrame {
        let _ = try session.require()

        var payloadDict: [String: Any] = [
            "pool": poolName,
            "groupSize": options.groupSize,
        ]
        if let mode = options.mode { payloadDict["mode"] = mode.rawValue }
        if let role = options.role { payloadDict["role"] = role.rawValue }
        if let attributes = options.attributes {
            payloadDict["attributes"] = attributes.mapValues { $0.value }
        }
        if let filter = options.filter { payloadDict["filter"] = filter }
        if let create = options.create { payloadDict["create"] = create }

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.enter",
            payload: AnyCodable(payloadDict)
        )

        let response = try await connection.sendAndWait(frame)
        currentPool = poolName

        if let members = response.payloadValue("members") as? [[String: Any]] {
            for m in members {
                if let id = m["id"] as? String {
                    let attrs = (m["attributes"] as? [String: Any])?.mapValues { AnyCodable($0) }
                    let member = PoolMember(id: id, attributes: attrs)
                    membersMap[id] = member
                }
            }
            members$.set(Array(membersMap.values))
        }

        return response
    }

    /// Leave a matchmaking pool.
    public func leave(pool poolName: String) throws {
        let _ = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.leave",
            payload: AnyCodable(["pool": poolName] as [String: Any])
        )

        try connection.send(frame)

        if currentPool == poolName {
            clearState()
        }
    }

    /// Claim a specific member in the pool (claim/mutual modes).
    public func claim(pool poolName: String, target: String) throws {
        let _ = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.claim",
            payload: AnyCodable(["pool": poolName, "target": target] as [String: Any])
        )

        try connection.send(frame)
    }

    /// Accept a proposal (propose mode).
    public func accept(pool poolName: String, from: String) throws {
        let _ = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.accept",
            payload: AnyCodable(["pool": poolName, "from": from] as [String: Any])
        )

        try connection.send(frame)
    }

    /// Reject a proposal (propose mode).
    public func reject(pool poolName: String, from: String) throws {
        let _ = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.reject",
            payload: AnyCodable(["pool": poolName, "from": from] as [String: Any])
        )

        try connection.send(frame)
    }

    /// Assign groups of members (delegated/matchmaker mode).
    @discardableResult
    public func assign(pool poolName: String, groups: [[String]]) async throws -> StarfishFrame {
        let _ = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "pool"),
            type: "pool.assign",
            payload: AnyCodable(["pool": poolName, "groups": groups] as [String: Any])
        )

        return try await connection.sendAndWait(frame)
    }

    /// Process an incoming pool-related frame.
    func handleFrame(_ frame: StarfishFrame) {
        guard let payloadDict = frame.payload?.value as? [String: Any],
              let pool = payloadDict["pool"] as? String,
              pool == currentPool else { return }

        switch frame.type {
        case "pool.member.joined":
            if let memberDict = payloadDict["member"] as? [String: Any],
               let id = memberDict["id"] as? String {
                let attrs = (memberDict["attributes"] as? [String: Any])?.mapValues { AnyCodable($0) }
                membersMap[id] = PoolMember(id: id, attributes: attrs)
                members$.set(Array(membersMap.values))
            }

        case "pool.member.left":
            if let memberId = payloadDict["memberId"] as? String {
                membersMap.removeValue(forKey: memberId)
                members$.set(Array(membersMap.values))
            }

        case "pool.matched":
            let session = payloadDict["session"] as? String ?? ""
            let peers = parsePeers(payloadDict["peers"])
            matched$.emit(PoolMatchResult(pool: pool, session: session, peers: peers))
            clearState()

        case "pool.proposal":
            proposals$.emit(frame)

        case "pool.claim.rejected":
            claimRejected$.emit(frame)

        default:
            break
        }
    }

    func clear() {
        clearState()
    }

    private func clearState() {
        currentPool = nil
        membersMap.removeAll()
        members$.set([])
    }

    private func parsePeers(_ value: Any?) -> [PoolMember] {
        guard let arr = value as? [[String: Any]] else { return [] }
        return arr.compactMap { dict in
            guard let id = dict["id"] as? String else { return nil }
            let attrs = (dict["attributes"] as? [String: Any])?.mapValues { AnyCodable($0) }
            return PoolMember(id: id, attributes: attrs)
        }
    }
}
