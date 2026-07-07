package starfish

// Payload size limits from the Starfish v0.1 specification.
const (
	MaxWSMessageSize  = 64 * 1024  // 64 KB
	MaxPresenceSize   = 8 * 1024   // 8 KB
	MaxDataValueSize  = 256 * 1024 // 256 KB
	MaxTopicNameLen   = 128        // characters
	MaxClientMetaSize = 16 * 1024  // 16 KB
)
