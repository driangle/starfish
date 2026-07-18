package starfish

import (
	"encoding/json"
	"sync"
	"time"
)

// PresenceThrottle batches presence updates and broadcasts at a fixed rate.
type PresenceThrottle struct {
	mu      sync.Mutex
	pending map[string]json.RawMessage // clientId -> latest presence payload
	session *Session
	hub     *Server
	ticker  *time.Ticker
	done    chan struct{}
}

// NewPresenceThrottle creates a throttle that broadcasts at the configured rate.
func NewPresenceThrottle(s *Session, hub *Server) *PresenceThrottle {
	interval := time.Duration(hub.config.PresenceThrottleMs) * time.Millisecond
	pt := &PresenceThrottle{
		pending: make(map[string]json.RawMessage),
		session: s,
		hub:     hub,
		ticker:  time.NewTicker(interval),
		done:    make(chan struct{}),
	}
	go pt.run()
	return pt
}

// Set enqueues a presence update for throttled broadcast.
func (pt *PresenceThrottle) Set(clientID string, payload json.RawMessage) {
	pt.mu.Lock()
	defer pt.mu.Unlock()
	pt.pending[clientID] = payload
}

// Stop shuts down the throttle goroutine.
func (pt *PresenceThrottle) Stop() {
	pt.ticker.Stop()
	close(pt.done)
}

func (pt *PresenceThrottle) run() {
	for {
		select {
		case <-pt.ticker.C:
			pt.flush()
		case <-pt.done:
			return
		}
	}
}

func (pt *PresenceThrottle) flush() {
	pt.mu.Lock()
	if len(pt.pending) == 0 {
		pt.mu.Unlock()
		return
	}
	// Snapshot and clear
	batch := pt.pending
	pt.pending = make(map[string]json.RawMessage)
	pt.mu.Unlock()

	for clientID, payload := range batch {
		// Convert the raw JSON payload to map[string]any for the envelope
		var presenceData map[string]any
		json.Unmarshal(payload, &presenceData)

		pt.session.Broadcast(&Frame{
			Header: Header{
				ID:       pt.hub.idGen.MessageID(),
				Resource: "presence",
				Method:   "updated",
				Kind:     "event",
				Session:  pt.session.name,
				From:     clientID,
			},
			Payload: presenceData,
		}, "") // Send to all including the sender
	}
}
