package starfish

import (
	"fmt"
	"sync/atomic"
)

// IDGenerator produces monotonically increasing message IDs with a given prefix.
type IDGenerator struct {
	counter atomic.Int64
}

// Next returns the next ID with the given prefix (e.g., "msg_1", "msg_2").
func (g *IDGenerator) Next(prefix string) string {
	n := g.counter.Add(1)
	return fmt.Sprintf("%s_%d", prefix, n)
}

// NextMessage returns the next message ID (e.g., "msg_1").
func (g *IDGenerator) NextMessage() string {
	return g.Next("msg")
}
