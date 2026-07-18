import Foundation

/// Main entry point for the Starfish SDK.
///
/// Composes all domain modules and provides a unified API for
/// connection management, sessions, topics, messaging, presence,
/// shared data, clock synchronization, and events.
public final class StarfishClient: @unchecked Sendable {
    private let connection: Connection
    private let heartbeat: Heartbeat
    private let _events: Events
    private let _session: Session
    private let _topics: Topics
    private let _messaging: Messaging
    private let _presence: Presence
    private let _data: DataModule
    private let _pool: Pool

    /// Server time synchronization.
    public let clock: Clock

    public init(options: StarfishClientOptions) {
        self.connection = Connection(options: options)
        self.heartbeat = Heartbeat(connection: connection)
        self.clock = Clock(connection: connection)
        self._events = Events()
        self._session = Session(connection: connection)
        self._topics = Topics(connection: connection, session: _session)
        self._messaging = Messaging(connection: connection, session: _session)
        self._presence = Presence(connection: connection, session: _session)
        self._data = DataModule(connection: connection, session: _session)
        self._pool = Pool(connection: connection, session: _session)

        connection.frames$.subscribe { [weak self] frame in
            self?.dispatchFrame(frame)
        }

        connection.state$.subscribe { [weak self] state in
            if state == .connected {
                self?.heartbeat.start()
            } else {
                self?.heartbeat.stop()
            }
        }
    }

    private func dispatchFrame(_ frame: StarfishFrame) {
        _events.dispatch(frame)
        _session.handleFrame(frame)
        _topics.handleFrame(frame)
        _presence.handleFrame(frame)
        _data.handleFrame(frame)
        _pool.handleFrame(frame)
    }

    // MARK: - Connection

    /// The current connection state as an AsyncStream.
    public var connectionState: AsyncStream<ConnectionState> {
        connection.state$.stream
    }

    /// The client ID assigned by the server after connection.
    public var clientId: String? {
        connection.clientId
    }

    /// Connect to the Starfish server.
    @discardableResult
    public func connect() async throws -> StarfishFrame {
        try await connection.connect()
    }

    /// Disconnect from the server.
    public func disconnect() {
        heartbeat.stop()
        _presence.clear()
        connection.disconnect()
    }

    // MARK: - Session

    /// All clients in the current session.
    public var clients: AsyncStream<[ClientInfo]> {
        _session.clients$.stream
    }

    /// All peers (excluding self) in the current session.
    public var peers: AsyncStream<[ClientInfo]> {
        _session.peers$.stream
    }

    /// Join a session.
    @discardableResult
    public func join(session: String, options: JoinOptions? = nil) async throws -> StarfishFrame {
        try await _session.join(session: session, options: options)
    }

    /// Leave the current session.
    public func leave() throws {
        _presence.clear()
        try _session.leave()
    }

    // MARK: - Topics

    /// Subscribe to a topic.
    @discardableResult
    public func subscribe(topic: String, callback: (@Sendable (StarfishFrame) -> Void)? = nil) async throws -> StarfishFrame {
        try await _topics.subscribe(topic: topic, callback: callback)
    }

    /// Unsubscribe from a topic.
    public func unsubscribe(topic: String) throws {
        try _topics.unsubscribe(topic: topic)
    }

    /// Publish a message to a topic.
    public func publish(topic: String, payload: AnyCodable, options: HeaderOptions? = nil) throws {
        try _topics.publish(topic: topic, payload: payload, options: options)
    }

    /// Get an AsyncStream of messages for a specific topic.
    public func topicStream(_ topic: String) -> AsyncStream<StarfishFrame> {
        _topics.topic$(topic).stream
    }

    // MARK: - Messaging

    /// Send a direct message to one or more clients.
    public func send(to: FrameTarget, payload: AnyCodable, options: HeaderOptions? = nil) throws {
        try _messaging.send(to: to, payload: payload, options: options)
    }

    /// Send a direct message to a single client.
    public func send(to clientId: String, payload: AnyCodable, options: HeaderOptions? = nil) throws {
        try _messaging.send(to: .single(clientId), payload: payload, options: options)
    }

    /// Broadcast a message to all clients in the session.
    public func broadcast(payload: AnyCodable, options: HeaderOptions? = nil) throws {
        try _messaging.broadcast(payload: payload, options: options)
    }

    // MARK: - Presence

    /// Access the presence manager.
    public var presence: Presence { _presence }

    /// Presence data for all peers as an AsyncStream.
    public var presenceStream: AsyncStream<[String: AnyCodable]> {
        _presence.presence$.stream
    }

    // MARK: - Data

    /// Save shared data.
    public func save(_ options: SaveOptions) async throws -> DataResult {
        try await _data.save(options)
    }

    /// Get shared data.
    public func get(key: String, scope: DataScope) async throws -> DataResult {
        try await _data.get(key: key, scope: scope)
    }

    /// Stream of all data changes.
    public var dataChanges: AsyncStream<DataResult> {
        _data.changed$.stream
    }

    /// Stream of changes for a specific key.
    public func keyStream(_ key: String) -> AsyncStream<DataResult> {
        _data.key$(key).stream
    }

    // MARK: - Pool

    /// Access the pool matchmaking manager.
    public var pool: Pool { _pool }

    /// Enter a matchmaking pool.
    @discardableResult
    public func enterPool(_ options: PoolEnterOptions, pool poolName: String) async throws -> StarfishFrame {
        try await _pool.enter(options, pool: poolName)
    }

    /// Leave a matchmaking pool.
    public func leavePool(_ poolName: String) throws {
        try _pool.leave(pool: poolName)
    }

    /// Pool members as an AsyncStream.
    public var poolMembers: AsyncStream<[PoolMember]> {
        _pool.members$.stream
    }

    /// Pool match events as an AsyncStream.
    public var poolMatched: AsyncStream<PoolMatchResult> {
        _pool.matched$.stream
    }

    // MARK: - Events

    /// Get an AsyncStream of events, optionally filtered.
    public func events(filter: EventFilter? = nil) -> AsyncStream<StarfishFrame> {
        _events.events$(filter: filter).stream
    }

    /// Subscribe to all events with a callback.
    @discardableResult
    public func on(_ callback: @escaping @Sendable (StarfishFrame) -> Void) -> Unsubscribe {
        _events.subscribe(callback)
    }

    /// Schedule a callback at a specific server time.
    @discardableResult
    public func at(serverTime: Int, callback: @escaping @Sendable () -> Void) -> Task<Void, Never> {
        clock.at(serverTime: serverTime, callback: callback)
    }
}
