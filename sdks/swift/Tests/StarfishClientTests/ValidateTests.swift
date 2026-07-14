import XCTest
@testable import StarfishClient

final class ValidateTests: XCTestCase {

    func testEncodeDecodeFrame() throws {
        let frame = StarfishFrame(
            id: "test_1",
            type: "test",
            payload: AnyCodable(["key": "value"] as [String: Any])
        )

        let json = try encodeFrame(frame)
        XCTAssertTrue(json.contains("test_1"))

        let decoded = try decodeFrame(json)
        XCTAssertEqual(decoded.id, "test_1")
        XCTAssertEqual(decoded.type, "test")
    }

    func testEncodePayload() throws {
        let payload: AnyCodable = ["name": "test", "count": 42]
        let json = try encodePayload(payload)
        XCTAssertTrue(json.contains("name"))
        XCTAssertTrue(json.contains("42"))
    }

    func testFrameWithAllFields() throws {
        let frame = StarfishFrame(
            v: 1,
            id: "full_1",
            type: "client.send",
            ts: 1234567890,
            session: "my-session",
            from: "sender",
            to: .single("receiver"),
            topic: "chat",
            ack: true,
            replyTo: "orig_1",
            transport: .ws,
            options: FrameOptions(
                delivery: DeliveryOptions(reliability: .reliable, ordering: .ordered),
                priority: .high
            ),
            payload: AnyCodable("hello")
        )

        let json = try encodeFrame(frame)
        let decoded = try decodeFrame(json)

        XCTAssertEqual(decoded.v, 1)
        XCTAssertEqual(decoded.id, "full_1")
        XCTAssertEqual(decoded.type, "client.send")
        XCTAssertEqual(decoded.ts, 1234567890)
        XCTAssertEqual(decoded.session, "my-session")
        XCTAssertEqual(decoded.from, "sender")
        XCTAssertEqual(decoded.to, .single("receiver"))
        XCTAssertEqual(decoded.topic, "chat")
        XCTAssertEqual(decoded.ack, true)
        XCTAssertEqual(decoded.replyTo, "orig_1")
        XCTAssertEqual(decoded.transport, .ws)
        XCTAssertEqual(decoded.options?.delivery?.reliability, .reliable)
        XCTAssertEqual(decoded.options?.priority, .high)
    }
}
