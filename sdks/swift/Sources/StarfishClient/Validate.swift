import Foundation

/// Encodes a StarfishFrame to a JSON string for sending over WebSocket.
func encodeFrame(_ frame: StarfishFrame) throws -> String {
    let encoder = JSONEncoder()
    let data = try encoder.encode(frame)
    guard let string = String(data: data, encoding: .utf8) else {
        throw StarfishError(code: .validationError, message: "Failed to encode frame as UTF-8 string")
    }
    return string
}

/// Decodes a JSON string into a StarfishFrame.
func decodeFrame(_ string: String) throws -> StarfishFrame {
    guard let data = string.data(using: .utf8) else {
        throw StarfishError(code: .validationError, message: "Failed to decode string as UTF-8 data")
    }
    let decoder = JSONDecoder()
    return try decoder.decode(StarfishFrame.self, from: data)
}

/// Encodes an AnyCodable value to a JSON string for size validation.
func encodePayload(_ value: AnyCodable) throws -> String {
    let encoder = JSONEncoder()
    let data = try encoder.encode(value)
    guard let string = String(data: data, encoding: .utf8) else {
        throw StarfishError(code: .validationError, message: "Failed to encode payload as UTF-8 string")
    }
    return string
}
