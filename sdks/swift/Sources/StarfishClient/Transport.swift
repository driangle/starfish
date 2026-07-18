import Foundation

/// Result of transport selection.
enum TransportDecision: Sendable, Equatable {
    case ws
    case rtc(peers: [String])
}

/// Protocol for querying RTC peer state (used by transport selection).
protocol RTCState {
    func isPeerConnected(_ peerId: String) -> Bool
    func getConnectedPeerIds() -> [String]
    func getTopicPeers(_ topic: String) -> [String]
}

/// Selects the appropriate transport (WS or RTC) for a given frame.
func selectTransport(
    frame: StarfishFrame,
    delivery: DeliveryOptions?,
    rtcState: RTCState?
) throws -> TransportDecision {
    let prefer = delivery?.preferTransport ?? .auto

    switch prefer {
    case .ws:
        return .ws
    case .rtc:
        return try selectRTC(frame: frame, delivery: delivery, rtcState: rtcState)
    case .auto:
        return selectAuto(frame: frame, delivery: delivery, rtcState: rtcState)
    }
}

private func selectRTC(
    frame: StarfishFrame,
    delivery: DeliveryOptions?,
    rtcState: RTCState?
) throws -> TransportDecision {
    let peers = resolveAvailablePeers(frame: frame, rtcState: rtcState)

    if !peers.isEmpty {
        return .rtc(peers: peers)
    }

    if delivery?.fallback != false {
        return .ws
    }

    throw StarfishError(
        code: .transportUnavailable,
        message: "RTC transport is not available and fallback is disabled"
    )
}

private func selectAuto(
    frame: StarfishFrame,
    delivery: DeliveryOptions?,
    rtcState: RTCState?
) -> TransportDecision {
    let resource = frame.header.resource
    let method = frame.header.method

    // data.*, session.*, presence.* -> always WS
    if resource == "data" || resource == "session" || resource == "presence" {
        return .ws
    }

    // topic.publish
    if resource == "topic" && method == "publish" {
        let reliability = delivery?.reliability ?? .reliable
        if reliability == .reliable {
            return .ws
        }
        // unreliable/latest -> RTC if peer path exists
        guard let topic = frame.header.topic, let rtcState = rtcState else { return .ws }
        let peers = rtcState.getTopicPeers(topic)
        let connectedPeers = peers.filter { rtcState.isPeerConnected($0) }
        return connectedPeers.isEmpty ? .ws : .rtc(peers: connectedPeers)
    }

    // message.send
    if resource == "message" && method == "send" {
        let peers = resolveAvailablePeers(frame: frame, rtcState: rtcState)
        return peers.isEmpty ? .ws : .rtc(peers: peers)
    }

    // Everything else -> WS
    return .ws
}

private func resolveAvailablePeers(frame: StarfishFrame, rtcState: RTCState?) -> [String] {
    guard let rtcState = rtcState else { return [] }

    // For topic.publish, resolve from topic subscription map
    if frame.header.resource == "topic" && frame.header.method == "publish", let topic = frame.header.topic {
        return rtcState.getTopicPeers(topic).filter { rtcState.isPeerConnected($0) }
    }

    // For direct messages, resolve from frame.to
    let targets: [String]
    switch frame.header.to {
    case .single(let id):
        targets = [id]
    case .multiple(let ids):
        targets = ids
    case nil:
        targets = []
    }

    return targets.filter { rtcState.isPeerConnected($0) }
}
