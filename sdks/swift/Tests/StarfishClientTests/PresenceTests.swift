import XCTest
@testable import StarfishClient

final class PresenceTests: XCTestCase {

    func testHandlePresenceUpdated() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            reconnect: ReconnectOptions(enabled: false),
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)
        let presence = Presence(connection: conn, session: session)

        presence.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "pres_1", resource: "presence", method: "updated", kind: .event,
                from: "peer-1"
            ),
            payload: ["data": AnyCodable(["status": "online"] as [String: Any])]
        ))

        let presenceMap = presence.presence$.value
        XCTAssertNotNil(presenceMap["peer-1"])
    }

    func testClearResetsPresence() async throws {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let session = Session(connection: conn)
        let presence = Presence(connection: conn, session: session)

        presence.handleFrame(StarfishFrame(
            header: StarfishHeader(
                id: "pres_1", resource: "presence", method: "updated", kind: .event,
                from: "peer-1"
            ),
            payload: ["data": AnyCodable(["status": "online"] as [String: Any])]
        ))
        XCTAssertFalse(presence.presence$.value.isEmpty)

        presence.clear()
        XCTAssertTrue(presence.presence$.value.isEmpty)
    }
}
