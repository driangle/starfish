import XCTest
@testable import StarfishClient

final class ValidateTests: XCTestCase {

    func testEncodeDecodeFrame() throws {
        let frame = StarfishFrame(
            header: StarfishHeader(
                id: "test_1",
                resource: "test",
                method: "test",
                kind: .request
            ),
            payload: ["key": AnyCodable("value")]
        )

        let json = try encodeFrame(frame)
        XCTAssertTrue(json.contains("test_1"))

        let decoded = try decodeFrame(json)
        XCTAssertEqual(decoded.header.id, "test_1")
        XCTAssertEqual(decoded.header.resource, "test")
        XCTAssertEqual(decoded.header.method, "test")
    }

    func testEncodePayload() throws {
        let payload: AnyCodable = ["name": "test", "count": 42]
        let json = try encodePayload(payload)
        XCTAssertTrue(json.contains("name"))
        XCTAssertTrue(json.contains("42"))
    }

    func testFrameWithAllFields() throws {
        let frame = StarfishFrame(
            header: StarfishHeader(
                v: 1,
                id: "full_1",
                resource: "message",
                method: "send",
                kind: .request,
                ts: 1234567890,
                session: "my-session",
                from: "sender",
                to: .single("receiver"),
                topic: "chat",
                replyTo: "orig_1",
                delivery: DeliveryOptions(reliability: .reliable, ordering: .ordered),
                priority: .high
            ),
            payload: ["data": AnyCodable("hello")]
        )

        let json = try encodeFrame(frame)
        let decoded = try decodeFrame(json)

        XCTAssertEqual(decoded.header.v, 1)
        XCTAssertEqual(decoded.header.id, "full_1")
        XCTAssertEqual(decoded.header.resource, "message")
        XCTAssertEqual(decoded.header.method, "send")
        XCTAssertEqual(decoded.header.kind, .request)
        XCTAssertEqual(decoded.header.ts, 1234567890)
        XCTAssertEqual(decoded.header.session, "my-session")
        XCTAssertEqual(decoded.header.from, "sender")
        XCTAssertEqual(decoded.header.to, .single("receiver"))
        XCTAssertEqual(decoded.header.topic, "chat")
        XCTAssertEqual(decoded.header.replyTo, "orig_1")
        XCTAssertEqual(decoded.header.delivery?.reliability, .reliable)
        XCTAssertEqual(decoded.header.priority, .high)
    }
}
