package starfish

import "fmt"

const (
	MaxWSMessageSize   = 64 * 1024
	MaxPresenceSize    = 8 * 1024
	MaxDataValueSize   = 256 * 1024
	MaxTopicNameLength = 128
	MaxClientMetaSize  = 16 * 1024
)

// ValidatePayloadSize checks that a serialized payload does not exceed the given limit.
func ValidatePayloadSize(data []byte, limit int, label string) error {
	if len(data) > limit {
		return fmt.Errorf("starfish: %s exceeds size limit: %d bytes > %d bytes", label, len(data), limit)
	}
	return nil
}

// ValidateTopicName checks that a topic name does not exceed the maximum length.
func ValidateTopicName(topic string) error {
	if len(topic) > MaxTopicNameLength {
		return fmt.Errorf("starfish: topic name exceeds %d characters: %q", MaxTopicNameLength, topic)
	}
	return nil
}
