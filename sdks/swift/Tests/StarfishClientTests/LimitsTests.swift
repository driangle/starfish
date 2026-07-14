import XCTest
@testable import StarfishClient

final class LimitsTests: XCTestCase {

    func testPayloadSizeWithinLimit() throws {
        let json = String(repeating: "x", count: 100)
        XCTAssertNoThrow(try validatePayloadSize(json, limit: 200, label: "test"))
    }

    func testPayloadSizeExceedsLimit() {
        let json = String(repeating: "x", count: 200)
        XCTAssertThrowsError(try validatePayloadSize(json, limit: 100, label: "test")) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .payloadTooLarge)
        }
    }

    func testPayloadSizeAtExactLimit() throws {
        let json = String(repeating: "x", count: 100)
        XCTAssertNoThrow(try validatePayloadSize(json, limit: 100, label: "test"))
    }

    func testTopicNameValid() throws {
        let topic = String(repeating: "a", count: 128)
        XCTAssertNoThrow(try validateTopicName(topic))
    }

    func testTopicNameTooLong() {
        let topic = String(repeating: "a", count: 129)
        XCTAssertThrowsError(try validateTopicName(topic)) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .topicNameTooLong)
        }
    }

    func testLimitConstants() {
        XCTAssertEqual(Limits.maxWSMessageSize, 64 * 1024)
        XCTAssertEqual(Limits.maxRTCControlSize, 64 * 1024)
        XCTAssertEqual(Limits.maxRTCStreamSize, 16 * 1024)
        XCTAssertEqual(Limits.maxPresenceSize, 8 * 1024)
        XCTAssertEqual(Limits.maxDataValueSize, 256 * 1024)
        XCTAssertEqual(Limits.maxTopicNameLength, 128)
        XCTAssertEqual(Limits.maxClientMetaSize, 16 * 1024)
    }
}
