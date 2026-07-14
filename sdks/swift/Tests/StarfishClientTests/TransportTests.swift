import XCTest
@testable import StarfishClient

/// Mock RTC state for transport tests.
private struct MockRTCState: RTCState {
    var connectedPeers: Set<String> = []
    var topicPeerMap: [String: [String]] = [:]

    func isPeerConnected(_ peerId: String) -> Bool {
        connectedPeers.contains(peerId)
    }

    func getConnectedPeerIds() -> [String] {
        Array(connectedPeers)
    }

    func getTopicPeers(_ topic: String) -> [String] {
        topicPeerMap[topic] ?? []
    }
}

final class TransportTests: XCTestCase {

    // MARK: - Prefer WS

    func testPreferWSAlwaysReturnsWS() throws {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer"))
        let delivery = DeliveryOptions(preferTransport: .ws)
        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    // MARK: - Auto mode

    func testAutoDataFrameAlwaysWS() throws {
        let frame = StarfishFrame(id: "1", type: "data.save")
        let result = try selectTransport(frame: frame, delivery: nil, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testAutoSessionFrameAlwaysWS() throws {
        let frame = StarfishFrame(id: "1", type: "session.broadcast")
        let result = try selectTransport(frame: frame, delivery: nil, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testAutoPresenceFrameAlwaysWS() throws {
        let frame = StarfishFrame(id: "1", type: "presence.set")
        let result = try selectTransport(frame: frame, delivery: nil, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testAutoTopicPublishReliableUsesWS() throws {
        let frame = StarfishFrame(id: "1", type: "topic.publish", topic: "chat")
        let delivery = DeliveryOptions(reliability: .reliable)
        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testAutoTopicPublishUnreliableWithRTCPeers() throws {
        let frame = StarfishFrame(id: "1", type: "topic.publish", topic: "chat")
        let delivery = DeliveryOptions(reliability: .unreliable)
        var rtc = MockRTCState()
        rtc.connectedPeers = ["peer-1"]
        rtc.topicPeerMap = ["chat": ["peer-1"]]

        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: rtc)
        XCTAssertEqual(result, .rtc(peers: ["peer-1"]))
    }

    func testAutoTopicPublishUnreliableWithoutRTCFallsBackToWS() throws {
        let frame = StarfishFrame(id: "1", type: "topic.publish", topic: "chat")
        let delivery = DeliveryOptions(reliability: .unreliable)
        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testAutoDirectSendWithRTCPeer() throws {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer-1"))
        var rtc = MockRTCState()
        rtc.connectedPeers = ["peer-1"]

        let result = try selectTransport(frame: frame, delivery: nil, rtcState: rtc)
        XCTAssertEqual(result, .rtc(peers: ["peer-1"]))
    }

    func testAutoDirectSendWithoutRTCUsesWS() throws {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer-1"))
        let result = try selectTransport(frame: frame, delivery: nil, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    // MARK: - Prefer RTC

    func testPreferRTCWithAvailablePeers() throws {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer-1"))
        let delivery = DeliveryOptions(preferTransport: .rtc)
        var rtc = MockRTCState()
        rtc.connectedPeers = ["peer-1"]

        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: rtc)
        XCTAssertEqual(result, .rtc(peers: ["peer-1"]))
    }

    func testPreferRTCFallsBackToWS() throws {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer-1"))
        let delivery = DeliveryOptions(preferTransport: .rtc, fallback: true)

        let result = try selectTransport(frame: frame, delivery: delivery, rtcState: nil)
        XCTAssertEqual(result, .ws)
    }

    func testPreferRTCNoFallbackThrows() {
        let frame = StarfishFrame(id: "1", type: "client.send", to: .single("peer-1"))
        let delivery = DeliveryOptions(preferTransport: .rtc, fallback: false)

        XCTAssertThrowsError(try selectTransport(frame: frame, delivery: delivery, rtcState: nil)) { error in
            let starfishError = error as! StarfishError
            XCTAssertEqual(starfishError.code, .transportUnavailable)
        }
    }
}
