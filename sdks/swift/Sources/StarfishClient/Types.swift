import Foundation

// MARK: - AnyCodable

/// Type-erased Codable wrapper for arbitrary JSON values.
public struct AnyCodable: Sendable, Equatable {
    public let value: Any

    public init(_ value: Any) {
        self.value = value
    }

    public static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
        // Compare via JSON serialization with sorted keys for deterministic output
        guard let lhsData = try? JSONSerialization.data(withJSONObject: lhs.jsonValue, options: .sortedKeys),
              let rhsData = try? JSONSerialization.data(withJSONObject: rhs.jsonValue, options: .sortedKeys) else {
            return false
        }
        return lhsData == rhsData
    }

    /// Returns a value suitable for JSONSerialization.
    var jsonValue: Any {
        switch value {
        case let v as AnyCodable:
            return v.jsonValue
        case let dict as [String: Any]:
            return dict.mapValues { AnyCodable($0).jsonValue }
        case let arr as [Any]:
            return arr.map { AnyCodable($0).jsonValue }
        default:
            return value
        }
    }
}

extension AnyCodable: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self.value = NSNull()
        } else if let bool = try? container.decode(Bool.self) {
            self.value = bool
        } else if let int = try? container.decode(Int.self) {
            self.value = int
        } else if let double = try? container.decode(Double.self) {
            self.value = double
        } else if let string = try? container.decode(String.self) {
            self.value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            self.value = array.map(\.value)
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            self.value = dict.mapValues(\.value)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported JSON value")
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case is NSNull:
            try container.encodeNil()
        case let v as Bool:
            try container.encode(v)
        case let v as Int:
            try container.encode(v)
        case let v as Double:
            try container.encode(v)
        case let v as String:
            try container.encode(v)
        case let v as [Any]:
            try container.encode(v.map { AnyCodable($0) })
        case let v as [String: Any]:
            try container.encode(v.mapValues { AnyCodable($0) })
        default:
            throw EncodingError.invalidValue(value, .init(codingPath: encoder.codingPath, debugDescription: "Unsupported type: \(type(of: value))"))
        }
    }
}

extension AnyCodable: ExpressibleByStringLiteral {
    public init(stringLiteral value: String) { self.value = value }
}

extension AnyCodable: ExpressibleByIntegerLiteral {
    public init(integerLiteral value: Int) { self.value = value }
}

extension AnyCodable: ExpressibleByFloatLiteral {
    public init(floatLiteral value: Double) { self.value = value }
}

extension AnyCodable: ExpressibleByBooleanLiteral {
    public init(booleanLiteral value: Bool) { self.value = value }
}

extension AnyCodable: ExpressibleByNilLiteral {
    public init(nilLiteral: ()) { self.value = NSNull() }
}

extension AnyCodable: ExpressibleByArrayLiteral {
    public init(arrayLiteral elements: AnyCodable...) { self.value = elements.map(\.value) }
}

extension AnyCodable: ExpressibleByDictionaryLiteral {
    public init(dictionaryLiteral elements: (String, AnyCodable)...) {
        self.value = Dictionary(uniqueKeysWithValues: elements.map { ($0.0, $0.1.value) })
    }
}

// MARK: - Frame Target

/// Represents the `to` field which can be a single client ID or multiple.
public enum FrameTarget: Sendable, Equatable {
    case single(String)
    case multiple([String])
}

extension FrameTarget: Codable {
    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let single = try? container.decode(String.self) {
            self = .single(single)
        } else if let multiple = try? container.decode([String].self) {
            self = .multiple(multiple)
        } else {
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Expected string or [string] for 'to'")
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .single(let id):
            try container.encode(id)
        case .multiple(let ids):
            try container.encode(ids)
        }
    }
}

// MARK: - Enums

public enum TransportKind: String, Sendable, Codable {
    case ws
    case rtc
}

public enum ConnectionState: String, Sendable {
    case disconnected
    case connecting
    case connected
    case reconnecting
}

public enum Reliability: String, Sendable, Codable {
    case reliable
    case unreliable
    case latest
}

public enum Ordering: String, Sendable, Codable {
    case ordered
    case unordered
}

public enum PreferredTransport: String, Sendable, Codable {
    case ws
    case rtc
    case auto
}

public enum Priority: String, Sendable, Codable {
    case low
    case normal
    case high
    case critical
}

public enum DataOp: String, Sendable, Codable {
    case replace
    case merge
    case setAdd = "set.add"
    case setRemove = "set.remove"
    case listAdd = "list.add"
    case listRemove = "list.remove"
    case counterAdd = "counter.add"
    case delete
}

public enum DataScope: String, Sendable, Codable {
    case `self`
    case session
}

// MARK: - Option structs

public struct DeliveryOptions: Sendable, Codable {
    public var reliability: Reliability?
    public var ordering: Ordering?
    public var preferTransport: PreferredTransport?
    public var fallback: Bool?
    public var includeSelf: Bool?

    public init(
        reliability: Reliability? = nil,
        ordering: Ordering? = nil,
        preferTransport: PreferredTransport? = nil,
        fallback: Bool? = nil,
        includeSelf: Bool? = nil
    ) {
        self.reliability = reliability
        self.ordering = ordering
        self.preferTransport = preferTransport
        self.fallback = fallback
        self.includeSelf = includeSelf
    }
}

public struct FrameOptions: Sendable, Codable {
    public var delivery: DeliveryOptions?
    public var priority: Priority?
    public var ttl: Int?
    public var requireAck: Bool?

    public init(
        delivery: DeliveryOptions? = nil,
        priority: Priority? = nil,
        ttl: Int? = nil,
        requireAck: Bool? = nil
    ) {
        self.delivery = delivery
        self.priority = priority
        self.ttl = ttl
        self.requireAck = requireAck
    }
}

public struct ClientIdentity: Sendable, Codable {
    public var name: String?
    public var role: String?
    public var meta: [String: AnyCodable]?

    public init(name: String? = nil, role: String? = nil, meta: [String: AnyCodable]? = nil) {
        self.name = name
        self.role = role
        self.meta = meta
    }
}

public struct AuthConfig: Sendable, Codable {
    public var type: String
    public var token: String?

    public init(type: String = "none", token: String? = nil) {
        self.type = type
        self.token = token
    }
}

public struct ReconnectOptions: Sendable {
    public var enabled: Bool
    public var maxRetries: Int
    public var baseDelay: TimeInterval
    public var maxDelay: TimeInterval

    public init(
        enabled: Bool = true,
        maxRetries: Int = .max,
        baseDelay: TimeInterval = 1.0,
        maxDelay: TimeInterval = 30.0
    ) {
        self.enabled = enabled
        self.maxRetries = maxRetries
        self.baseDelay = baseDelay
        self.maxDelay = maxDelay
    }

    public static let defaults = ReconnectOptions()
}

public struct StarfishClientOptions: Sendable {
    public var server: URL
    public var client: ClientIdentity?
    public var auth: AuthConfig?
    public var reconnect: ReconnectOptions?
    public var webSocketFactory: (@Sendable (URL) -> any WebSocketTransport)?

    public init(
        server: URL,
        client: ClientIdentity? = nil,
        auth: AuthConfig? = nil,
        reconnect: ReconnectOptions? = nil,
        webSocketFactory: (@Sendable (URL) -> any WebSocketTransport)? = nil
    ) {
        self.server = server
        self.client = client
        self.auth = auth
        self.reconnect = reconnect
        self.webSocketFactory = webSocketFactory
    }
}

// MARK: - Session types

public struct JoinOptions: Sendable {
    public var name: String?
    public var role: String?
    public var meta: [String: AnyCodable]?
    public var create: Bool?

    public init(name: String? = nil, role: String? = nil, meta: [String: AnyCodable]? = nil, create: Bool? = nil) {
        self.name = name
        self.role = role
        self.meta = meta
        self.create = create
    }
}

public struct ClientInfo: Sendable, Codable, Identifiable, Equatable {
    public var id: String
    public var name: String?
    public var role: String?
    public var meta: [String: AnyCodable]?

    public init(id: String, name: String? = nil, role: String? = nil, meta: [String: AnyCodable]? = nil) {
        self.id = id
        self.name = name
        self.role = role
        self.meta = meta
    }
}

// MARK: - Data types

public struct SaveOptions: Sendable {
    public var key: String
    public var scope: DataScope
    public var op: DataOp
    public var data: AnyCodable?
    public var expectedVersion: Int?

    public init(key: String, scope: DataScope, op: DataOp, data: AnyCodable? = nil, expectedVersion: Int? = nil) {
        self.key = key
        self.scope = scope
        self.op = op
        self.data = data
        self.expectedVersion = expectedVersion
    }
}

public struct DataResult: Sendable, Codable {
    public var key: String
    public var scope: DataScope
    public var data: AnyCodable?
    public var version: Int

    public init(key: String, scope: DataScope, data: AnyCodable? = nil, version: Int) {
        self.key = key
        self.scope = scope
        self.data = data
        self.version = version
    }
}

// MARK: - Pool types

public enum PoolMode: String, Sendable, Codable {
    case auto
    case claim
    case mutual
    case propose
    case delegated
}

public enum PoolRole: String, Sendable, Codable {
    case member
    case matchmaker
}

public struct PoolMember: Sendable, Equatable {
    public var id: String
    public var attributes: [String: AnyCodable]?

    public init(id: String, attributes: [String: AnyCodable]? = nil) {
        self.id = id
        self.attributes = attributes
    }
}

public struct PoolEnterOptions: Sendable {
    public var groupSize: Int
    public var mode: PoolMode?
    public var role: PoolRole?
    public var attributes: [String: AnyCodable]?
    public var filter: [String: String]?
    public var create: Bool?

    public init(
        groupSize: Int,
        mode: PoolMode? = nil,
        role: PoolRole? = nil,
        attributes: [String: AnyCodable]? = nil,
        filter: [String: String]? = nil,
        create: Bool? = nil
    ) {
        self.groupSize = groupSize
        self.mode = mode
        self.role = role
        self.attributes = attributes
        self.filter = filter
        self.create = create
    }
}

public struct PoolMatchResult: Sendable {
    public var pool: String
    public var session: String
    public var peers: [PoolMember]

    public init(pool: String, session: String, peers: [PoolMember]) {
        self.pool = pool
        self.session = session
        self.peers = peers
    }
}

public struct PoolAssignedGroup: Sendable {
    public var group: [String]
    public var session: String

    public init(group: [String], session: String) {
        self.group = group
        self.session = session
    }
}

public struct PoolAssignedResult: Sendable {
    public var pool: String
    public var matched: [PoolAssignedGroup]

    public init(pool: String, matched: [PoolAssignedGroup]) {
        self.pool = pool
        self.matched = matched
    }
}

// MARK: - Event filtering

public struct EventFilter: Sendable {
    public var type: String?
    public var topic: String?
    public var from: String?

    public init(type: String? = nil, topic: String? = nil, from: String? = nil) {
        self.type = type
        self.topic = topic
        self.from = from
    }
}

// MARK: - StarfishFrame

public struct StarfishFrame: Sendable, Codable {
    public var v: Int
    public var id: String
    public var type: String
    public var ts: Int?
    public var session: String?
    public var from: String?
    public var to: FrameTarget?
    public var topic: String?
    public var ack: Bool?
    public var replyTo: String?
    public var transport: TransportKind?
    public var options: FrameOptions?
    public var payload: AnyCodable?
    public var error: StarfishFrameError?

    public init(
        v: Int = 1,
        id: String,
        type: String,
        ts: Int? = nil,
        session: String? = nil,
        from: String? = nil,
        to: FrameTarget? = nil,
        topic: String? = nil,
        ack: Bool? = nil,
        replyTo: String? = nil,
        transport: TransportKind? = nil,
        options: FrameOptions? = nil,
        payload: AnyCodable? = nil,
        error: StarfishFrameError? = nil
    ) {
        self.v = v
        self.id = id
        self.type = type
        self.ts = ts
        self.session = session
        self.from = from
        self.to = to
        self.topic = topic
        self.ack = ack
        self.replyTo = replyTo
        self.transport = transport
        self.options = options
        self.payload = payload
        self.error = error
    }
}

// MARK: - Frame payload helpers

extension StarfishFrame {
    /// Access a string value from the payload dictionary.
    public func payloadString(_ key: String) -> String? {
        guard let dict = payload?.value as? [String: Any] else { return nil }
        return dict[key] as? String
    }

    /// Access an int value from the payload dictionary.
    public func payloadInt(_ key: String) -> Int? {
        guard let dict = payload?.value as? [String: Any] else { return nil }
        return dict[key] as? Int
    }

    /// Access a nested value from the payload dictionary.
    public func payloadValue(_ key: String) -> Any? {
        guard let dict = payload?.value as? [String: Any] else { return nil }
        return dict[key]
    }
}
