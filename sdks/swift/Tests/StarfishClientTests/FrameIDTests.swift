import XCTest
@testable import StarfishClient

final class FrameIDTests: XCTestCase {

    func testSequentialIds() {
        let gen = FrameIDGenerator()
        XCTAssertEqual(gen.nextId(prefix: "msg"), "msg_1")
        XCTAssertEqual(gen.nextId(prefix: "msg"), "msg_2")
        XCTAssertEqual(gen.nextId(prefix: "msg"), "msg_3")
    }

    func testDifferentPrefixes() {
        let gen = FrameIDGenerator()
        XCTAssertEqual(gen.nextId(prefix: "hello"), "hello_1")
        XCTAssertEqual(gen.nextId(prefix: "join"), "join_2")
        XCTAssertEqual(gen.nextId(prefix: "pub"), "pub_3")
    }

    func testDefaultPrefix() {
        let gen = FrameIDGenerator()
        XCTAssertEqual(gen.nextId(), "msg_1")
    }

    func testReset() {
        let gen = FrameIDGenerator()
        _ = gen.nextId(prefix: "a")
        _ = gen.nextId(prefix: "b")
        gen.reset()
        XCTAssertEqual(gen.nextId(prefix: "c"), "c_1")
    }
}
