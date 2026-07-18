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
        guard frame.header.resource == "data" && frame.header.method == "changed" else { return }
        guard let payload = frame.payload else { return }

        guard let key = payload["key"]?.value as? String,
              let scopeStr = payload["scope"]?.value as? String,
              let scope = DataScope(rawValue: scopeStr),
              let version = payload["version"]?.value as? Int else { return }

        let result = DataResult(
            key: key,
            scope: scope,
            data: payload["data"],
            version: version
        )
        changed$.emit(result)
        dataStreams[key]?.emit(result)
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

        var payload: [String: AnyCodable] = [
            "key": AnyCodable(options.key),
            "scope": AnyCodable(options.scope.rawValue),
            "op": AnyCodable(options.op.rawValue),
        ]
        if let data = options.data {
            payload["data"] = data
        }
        if let expectedVersion = options.expectedVersion {
            payload["expectedVersion"] = AnyCodable(expectedVersion)
        }

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "dsave"),
                resource: "data",
                method: "save",
                kind: .request,
                session: sessionName
            ),
            payload: payload
        )

        let response = try await connection.sendAndWait(frame)
        return DataResult(
            key: response.payloadString("key") ?? options.key,
            scope: DataScope(rawValue: response.payloadString("scope") ?? options.scope.rawValue) ?? options.scope,
            data: response.payload?["data"],
            version: response.payloadInt("version") ?? 0
        )
    }

    func get(key: String, scope: DataScope) async throws -> DataResult {
        let sessionName = try session.require()

        let frame = StarfishFrame(
            header: StarfishHeader(
                id: connection.idGen.nextId(prefix: "dget"),
                resource: "data",
                method: "get",
                kind: .request,
                session: sessionName
            ),
            payload: [
                "key": AnyCodable(key),
                "scope": AnyCodable(scope.rawValue),
            ]
        )

        let response = try await connection.sendAndWait(frame)
        return DataResult(
            key: response.payloadString("key") ?? key,
            scope: DataScope(rawValue: response.payloadString("scope") ?? scope.rawValue) ?? scope,
            data: response.payload?["data"],
            version: response.payloadInt("version") ?? 0
        )
    }
}
