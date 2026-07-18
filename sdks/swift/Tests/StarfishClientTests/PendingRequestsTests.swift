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

        let response = StarfishFrame(
            header: StarfishHeader(
                id: "resp_1", resource: "session", method: "joined", kind: .response,
                replyTo: "msg_1"
            )
        )
        let consumed = pending.resolve(frame: response)

        XCTAssertTrue(consumed)
        let result = try await task.value
        XCTAssertEqual(result.header.method, "joined")
    }

    func testResolveWithError() async {
        let pending = PendingRequests()

        let task = Task {
            try await pending.add(messageId: "msg_2", timeout: 5.0)
        }

        try? await Task.sleep(nanoseconds: 50_000_000)

        let errorFrame = StarfishFrame(
            header: StarfishHeader(
                id: "err_1", resource: "error", method: "error", kind: .response,
                replyTo: "msg_2"
            ),
            payload: [
                "code": AnyCodable("SERVER_ERROR"),
                "message": AnyCodable("Something went wrong"),
            ]
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
        let frame = StarfishFrame(
            header: StarfishHeader(
                id: "unknown_1", resource: "test", method: "test", kind: .response,
                replyTo: "nonexistent"
            )
        )
        XCTAssertFalse(pending.resolve(frame: frame))
    }

    func testResolveNoReplyTo() {
        let pending = PendingRequests()
        let frame = StarfishFrame(
            header: StarfishHeader(id: "test_1", resource: "test", method: "test", kind: .event)
        )
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
