import XCTest
@testable import StarfishClient

final class TypesTests: XCTestCase {

    // MARK: - AnyCodable

    func testAnyCodableStringLiteral() {
        let val: AnyCodable = "hello"
        XCTAssertEqual(val.value as? String, "hello")
    }

    func testAnyCodableIntLiteral() {
        let val: AnyCodable = 42
        XCTAssertEqual(val.value as? Int, 42)
    }

    func testAnyCodableBoolLiteral() {
        let val: AnyCodable = true
        XCTAssertEqual(val.value as? Bool, true)
    }

    func testAnyCodableDictionaryLiteral() {
        let val: AnyCodable = ["name": "test", "count": 5]
        let dict = val.value as? [String: Any]
        XCTAssertNotNil(dict)
        XCTAssertEqual(dict?["name"] as? String, "test")
        XCTAssertEqual(dict?["count"] as? Int, 5)
    }

    func testAnyCodableArrayLiteral() {
        let val: AnyCodable = [1, 2, 3]
        let arr = val.value as? [Any]
        XCTAssertNotNil(arr)
        XCTAssertEqual(arr?.count, 3)
    }

    func testAnyCodableRoundTrip() throws {
        let original: AnyCodable = ["key": "value", "number": 42, "nested": ["a": true]]
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(AnyCodable.self, from: data)
        XCTAssertEqual(original, decoded)
    }

    // MARK: - FrameTarget

    func testFrameTargetSingleRoundTrip() throws {
        let target = FrameTarget.single("client-123")
        let data = try JSONEncoder().encode(target)
        let decoded = try JSONDecoder().decode(FrameTarget.self, from: data)
        XCTAssertEqual(decoded, target)
    }

    func testFrameTargetMultipleRoundTrip() throws {
        let target = FrameTarget.multiple(["a", "b", "c"])
        let data = try JSONEncoder().encode(target)
        let decoded = try JSONDecoder().decode(FrameTarget.self, from: data)
        XCTAssertEqual(decoded, target)
    }

    // MARK: - StarfishFrame

    func testFrameRoundTrip() throws {
        let frame = StarfishFrame(
            header: StarfishHeader(
                v: 1,
                id: "test_1",
                resource: "client",
                method: "hello",
                kind: .request,
                ts: 1234567890,
                session: "my-session",
                topic: "chat"
            ),
            payload: ["message": AnyCodable("hello")]
        )

        let json = try encodeFrame(frame)
        let decoded = try decodeFrame(json)

        XCTAssertEqual(decoded.header.id, "test_1")
        XCTAssertEqual(decoded.header.resource, "client")
        XCTAssertEqual(decoded.header.method, "hello")
        XCTAssertEqual(decoded.header.kind, .request)
        XCTAssertEqual(decoded.header.ts, 1234567890)
        XCTAssertEqual(decoded.header.session, "my-session")
        XCTAssertEqual(decoded.header.topic, "chat")
        XCTAssertEqual(decoded.payloadString("message"), "hello")
    }

    func testFrameWithTarget() throws {
        let frame = StarfishFrame(
            header: StarfishHeader(
                id: "send_1",
                resource: "message",
                method: "send",
                kind: .request,
                to: .multiple(["a", "b"])
            )
        )

        let json = try encodeFrame(frame)
        let decoded = try decodeFrame(json)

        if case .multiple(let ids) = decoded.header.to {
            XCTAssertEqual(ids, ["a", "b"])
        } else {
            XCTFail("Expected multiple target")
        }
    }

    func testFramePayloadHelpers() {
        let frame = StarfishFrame(
            header: StarfishHeader(
                id: "test_1",
                resource: "test",
                method: "test",
                kind: .request
            ),
            payload: [
                "name": AnyCodable("test"),
                "count": AnyCodable(42),
                "nested": AnyCodable(["key": "value"] as [String: Any]),
            ]
        )

        XCTAssertEqual(frame.payloadString("name"), "test")
        XCTAssertEqual(frame.payloadInt("count"), 42)
        XCTAssertNotNil(frame.payloadValue("nested"))
        XCTAssertNil(frame.payloadString("missing"))
    }

    // MARK: - DataOp

    func testDataOpRawValues() {
        XCTAssertEqual(DataOp.replace.rawValue, "replace")
        XCTAssertEqual(DataOp.merge.rawValue, "merge")
        XCTAssertEqual(DataOp.setAdd.rawValue, "set.add")
        XCTAssertEqual(DataOp.setRemove.rawValue, "set.remove")
        XCTAssertEqual(DataOp.listAdd.rawValue, "list.add")
        XCTAssertEqual(DataOp.listRemove.rawValue, "list.remove")
        XCTAssertEqual(DataOp.counterAdd.rawValue, "counter.add")
        XCTAssertEqual(DataOp.delete.rawValue, "delete")
    }

    // MARK: - ClientInfo

    func testClientInfoRoundTrip() throws {
        let info = ClientInfo(id: "c1", name: "Alice", role: "admin")
        let data = try JSONEncoder().encode(info)
        let decoded = try JSONDecoder().decode(ClientInfo.self, from: data)
        XCTAssertEqual(decoded, info)
    }
}
