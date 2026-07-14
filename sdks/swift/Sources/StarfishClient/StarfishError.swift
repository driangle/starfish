import Foundation

public struct StarfishError: Error, Sendable, CustomStringConvertible {
    public let code: ErrorCode
    public let message: String
    public let details: AnyCodable?

    public init(code: ErrorCode, message: String, details: AnyCodable? = nil) {
        self.code = code
        self.message = message
        self.details = details
    }

    public var description: String {
        "StarfishError(\(code.rawValue)): \(message)"
    }

    public enum ErrorCode: String, Sendable, Codable {
        case connectionFailed = "CONNECTION_FAILED"
        case notConnected = "NOT_CONNECTED"
        case disconnected = "DISCONNECTED"
        case noSession = "NO_SESSION"
        case requestTimeout = "REQUEST_TIMEOUT"
        case serverError = "SERVER_ERROR"
        case payloadTooLarge = "PAYLOAD_TOO_LARGE"
        case topicNameTooLong = "TOPIC_NAME_TOO_LONG"
        case validationError = "VALIDATION_ERROR"
        case rtcNotEnabled = "RTC_NOT_ENABLED"
        case rtcNoPeer = "RTC_NO_PEER"
        case rtcChannelNotOpen = "RTC_CHANNEL_NOT_OPEN"
        case transportUnavailable = "TRANSPORT_UNAVAILABLE"
        case noWebSocket = "NO_WEBSOCKET"
    }
}

/// Error shape as it appears in protocol frames.
public struct StarfishFrameError: Sendable, Codable {
    public let code: String
    public let message: String
    public let details: AnyCodable?

    public init(code: String, message: String, details: AnyCodable? = nil) {
        self.code = code
        self.message = message
        self.details = details
    }
}
