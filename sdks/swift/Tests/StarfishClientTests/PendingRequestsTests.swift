import XCTest
@testable import StarfishClient

final class PendingRequestsTests: XCTestCase {

    func testResolveHappyPath() async throws {
        let pending = PendingRequests()

        let task = Task {
            try await pending.add(messageId: "msg_1", timeout: 5.0)
        }

        // Give the continuation time to register
        try await Task.sleep(nanoseconds: 50_000_000)

        let response = StarfishFrame(id: "resp_1", type: "session.joined", replyTo: "msg_1")
        let consumed = pending.resolve(frame: response)

        XCTAssertTrue(consumed)
        let result = try await task.value
        XCTAssertEqual(result.type, "session.joined")
    }

    func testResolveWithError() async {
        let pending = PendingRequests()

        let task = Task {
            try await pending.add(messageId: "msg_2", timeout: 5.0)
        }

        try? await Task.sleep(nanoseconds: 50_000_000)

        let errorFrame = StarfishFrame(
            id: "err_1",
            type: "error",
            replyTo: "msg_2",
            error: StarfishFrameError(code: "SERVER_ERROR", message: "Something went wrong")
        )
        _ = pending.resolve(frame: errorFrame)

        do {
            _ = try await task.value
            XCTFail("Should have thrown")
        } catch {
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .serverError)
        }
    }

    func testResolveUnknownFrame() {
        let pending = PendingRequests()
        let frame = StarfishFrame(id: "unknown_1", type: "test", replyTo: "nonexistent")
        XCTAssertFalse(pending.resolve(frame: frame))
    }

    func testResolveNoReplyTo() {
        let pending = PendingRequests()
        let frame = StarfishFrame(id: "test_1", type: "test")
        XCTAssertFalse(pending.resolve(frame: frame))
    }

    func testTimeout() async {
        let pending = PendingRequests()

        do {
            _ = try await pending.add(messageId: "msg_timeout", timeout: 0.1)
            XCTFail("Should have timed out")
        } catch {
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .requestTimeout)
        }
    }

    func testRejectAll() async {
        let pending = PendingRequests()

        let task1 = Task { try await pending.add(messageId: "a", timeout: 5.0) }
        let task2 = Task { try await pending.add(messageId: "b", timeout: 5.0) }

        try? await Task.sleep(nanoseconds: 50_000_000)

        pending.rejectAll(error: StarfishError(code: .disconnected, message: "Disconnected"))

        do {
            _ = try await task1.value
            XCTFail("Should have thrown")
        } catch {
            XCTAssertTrue(error is StarfishError)
        }

        do {
            _ = try await task2.value
            XCTFail("Should have thrown")
        } catch {
            XCTAssertTrue(error is StarfishError)
        }
    }
}
