import Foundation

public enum Limits {
    public static let maxWSMessageSize = 64 * 1024
    public static let maxRTCControlSize = 64 * 1024
    public static let maxRTCStreamSize = 16 * 1024
    public static let maxPresenceSize = 8 * 1024
    public static let maxDataValueSize = 256 * 1024
    public static let maxTopicNameLength = 128
    public static let maxClientMetaSize = 16 * 1024
}

func validatePayloadSize(_ json: String, limit: Int, label: String) throws {
    let size = json.utf8.count
    if size > limit {
        throw StarfishError(
            code: .payloadTooLarge,
            message: "\(label) exceeds size limit: \(size) bytes > \(limit) bytes"
        )
    }
}

func validateTopicName(_ topic: String) throws {
    if topic.count > Limits.maxTopicNameLength {
        throw StarfishError(
            code: .topicNameTooLong,
            message: "Topic name exceeds \(Limits.maxTopicNameLength) characters: \"\(topic)\""
        )
    }
}
