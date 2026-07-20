package starfish

import (
	"context"
	"fmt"
	"sort"
	"sync"
	"time"
)

const defaultClockSamples = 5

// clockManager handles clock synchronization with the server.
type clockManager struct {
	mu     sync.RWMutex
	conn   *connection
	idg    *IDGenerator
	offset int64 // estimated server-client offset in ms
	synced bool
}

func newClockManager(conn *connection, idg *IDGenerator) *clockManager {
	return &clockManager{
		conn: conn,
		idg:  idg,
	}
}

// sync performs clock synchronization with the server using multiple samples.
func (c *clockManager) sync(ctx context.Context, samples int) error {
	if samples <= 0 {
		samples = defaultClockSamples
	}
	if samples < 3 {
		samples = 3 // minimum 3 per protocol spec
	}

	offsets := make([]int64, 0, samples)

	for i := 0; i < samples; i++ {
		offset, err := c.takeSample(ctx)
		if err != nil {
			return fmt.Errorf("starfish: clock sync sample %d failed: %w", i, err)
		}
		offsets = append(offsets, offset)

		// Small delay between samples to avoid burst
		if i < samples-1 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(50 * time.Millisecond):
			}
		}
	}

	// Use median offset
	sort.Slice(offsets, func(i, j int) bool { return offsets[i] < offsets[j] })
	median := offsets[len(offsets)/2]

	c.mu.Lock()
	c.offset = median
	c.synced = true
	c.mu.Unlock()

	return nil
}

func (c *clockManager) takeSample(ctx context.Context) (int64, error) {
	sendTime := time.Now().UnixMilli()
	ts := sendTime

	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       c.idg.Next("clock"),
			Resource: "clock",
			Method:   "sync",
			Kind:     "request",
			Ts:       &ts,
		},
	}

	reply, err := c.conn.sendAndWait(ctx, frame, 5*time.Second)
	if err != nil {
		return 0, err
	}

	receiveTime := time.Now().UnixMilli()
	rtt := receiveTime - sendTime

	serverTime, ok := reply.Payload["serverTime"].(float64)
	if !ok {
		return 0, fmt.Errorf("starfish: clock.synced missing serverTime")
	}

	// NTP-style offset: serverTime - (sendTime + rtt/2)
	offset := int64(serverTime) - (sendTime + rtt/2)
	return offset, nil
}

// now returns the estimated server time.
func (c *clockManager) now() int64 {
	c.mu.RLock()
	offset := c.offset
	c.mu.RUnlock()
	return time.Now().UnixMilli() + offset
}

// getOffset returns the current clock offset in milliseconds.
func (c *clockManager) getOffset() int64 {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.offset
}

// setInitialOffset sets the offset from the welcome message's serverTime.
func (c *clockManager) setInitialOffset(serverTime int64) {
	c.mu.Lock()
	c.offset = serverTime - time.Now().UnixMilli()
	c.mu.Unlock()
}
