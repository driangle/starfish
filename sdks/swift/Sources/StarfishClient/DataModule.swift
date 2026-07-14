import Foundation

/// Manages shared data operations: save, get, and change observation.
final class DataModule: @unchecked Sendable {
    private let connection: Connection
    private let session: Session
    private var dataStreams: [String: EventStream<DataResult>] = [:]

    let changed$ = EventStream<DataResult>()

    init(connection: Connection, session: Session) {
        self.connection = connection
        self.session = session
    }

    func handleFrame(_ frame: StarfishFrame) {
        if frame.type == "data.changed", let payloadDict = frame.payload?.value as? [String: Any] {
            guard let key = payloadDict["key"] as? String,
                  let scopeStr = payloadDict["scope"] as? String,
                  let scope = DataScope(rawValue: scopeStr),
                  let version = payloadDict["version"] as? Int else { return }

            let result = DataResult(
                key: key,
                scope: scope,
                data: payloadDict["data"].map { AnyCodable($0) },
                version: version
            )
            changed$.emit(result)
            dataStreams[key]?.emit(result)
        }
    }

    func key$(_ key: String) -> EventStream<DataResult> {
        if let existing = dataStreams[key] {
            return existing
        }
        let stream = EventStream<DataResult>()
        dataStreams[key] = stream
        return stream
    }

    func save(_ options: SaveOptions) async throws -> DataResult {
        let sessionName = try session.require()

        if let data = options.data {
            let json = try encodePayload(data)
            try validatePayloadSize(json, limit: Limits.maxDataValueSize, label: "Data value")
        }

        var payloadDict: [String: Any] = [
            "key": options.key,
            "scope": options.scope.rawValue,
            "op": options.op.rawValue,
        ]
        if let data = options.data {
            payloadDict["data"] = data.value
        }
        if let expectedVersion = options.expectedVersion {
            payloadDict["expectedVersion"] = expectedVersion
        }

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "dsave"),
            type: "data.save",
            session: sessionName,
            payload: AnyCodable(payloadDict)
        )

        let response = try await connection.sendAndWait(frame)
        return DataResult(
            key: response.payloadString("key") ?? options.key,
            scope: DataScope(rawValue: response.payloadString("scope") ?? options.scope.rawValue) ?? options.scope,
            data: response.payloadValue("data").map { AnyCodable($0) },
            version: response.payloadInt("version") ?? 0
        )
    }

    func get(key: String, scope: DataScope) async throws -> DataResult {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            id: connection.idGen.nextId(prefix: "dget"),
            type: "data.get",
            session: sessionName,
            payload: AnyCodable(["key": key, "scope": scope.rawValue] as [String: Any])
        )

        let response = try await connection.sendAndWait(frame)
        return DataResult(
            key: response.payloadString("key") ?? key,
            scope: DataScope(rawValue: response.payloadString("scope") ?? scope.rawValue) ?? scope,
            data: response.payloadValue("data").map { AnyCodable($0) },
            version: response.payloadInt("version") ?? 0
        )
    }
}
