import XCTest
@testable import StarfishClient

final class DataModuleTests: XCTestCase {

    func testHandleDataChanged() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)
        let data = DataModule(connection: conn, session: session)

        let received = Collected<DataResult>()
        let unsub = data.changed$.subscribe { received.append($0) }

        data.handleFrame(StarfishFrame(
            id: "dc_1", type: "data.changed",
            payload: AnyCodable([
                "key": "score",
                "scope": "session",
                "data": 100,
                "version": 1,
            ] as [String: Any])
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.count, 1)
        XCTAssertEqual(received.first?.key, "score")
        XCTAssertEqual(received.first?.version, 1)
        unsub()
    }

    func testKeyStream() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)
        let data = DataModule(connection: conn, session: session)

        let received = Collected<DataResult>()
        let unsub = data.key$("score").subscribe { received.append($0) }

        // This should NOT be received (different key)
        data.handleFrame(StarfishFrame(
            id: "dc_1", type: "data.changed",
            payload: AnyCodable(["key": "other", "scope": "session", "data": 0, "version": 1] as [String: Any])
        ))

        // This should be received
        data.handleFrame(StarfishFrame(
            id: "dc_2", type: "data.changed",
            payload: AnyCodable(["key": "score", "scope": "session", "data": 42, "version": 2] as [String: Any])
        ))

        try await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertEqual(received.count, 1)
        XCTAssertEqual(received.first?.key, "score")
        unsub()
    }
}
