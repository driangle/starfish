package starfish

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sync/atomic"
)

// IDGenerator produces unique IDs for clients, messages, and resume tokens.
type IDGenerator struct {
	msgCounter atomic.Int64
}

// NewIDGenerator creates a new IDGenerator.
func NewIDGenerator() *IDGenerator {
	return &IDGenerator{}
}

// ClientID generates a unique client identifier.
func (g *IDGenerator) ClientID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return "client_" + hex.EncodeToString(b)
}

// ResumeToken generates a unique resume token.
func (g *IDGenerator) ResumeToken() string {
	b := make([]byte, 8)
	rand.Read(b)
	return "rt_" + hex.EncodeToString(b)
}

// MessageID generates a unique server message ID.
func (g *IDGenerator) MessageID() string {
	return fmt.Sprintf("srv_%d", g.msgCounter.Add(1))
}

// SessionName generates a unique session name for pool matches.
func (g *IDGenerator) SessionName() string {
	b := make([]byte, 4)
	rand.Read(b)
	return "match_" + hex.EncodeToString(b)
}
