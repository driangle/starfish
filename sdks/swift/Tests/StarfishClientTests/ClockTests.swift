import XCTest
@testable import StarfishClient

final class ClockTests: XCTestCase {

    func testNowReturnsCurrentTimeWithOffset() {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let clock = Clock(connection: conn)

        let before = Int(Date().timeIntervalSince1970 * 1000)
        let now = clock.now()
        let after = Int(Date().timeIntervalSince1970 * 1000)

        // With zero offset, now() should be close to Date.now
        XCTAssertTrue(now >= before && now <= after + 1)
    }

    func testInitialOffset() {
        let mock = MockWebSocketTransport()
        let options = StarfishClientOptions(
            server: URL(string: "ws://localhost:8080/starfish")!,
            webSocketFactory: { _ in mock }
        )
        let conn = Connection(options: options)
        let clock = Clock(connection: conn)

        XCTAssertEqual(clock.offset, 0)
    }
}
