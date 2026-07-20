package starfish

import (
	"context"
	"encoding/json"
	"sync"
	"time"
)

// presenceManager handles presence set and tracking.
type presenceManager struct {
	mu      sync.RWMutex
	conn    *connection
	idg     *IDGenerator
	session func() string
	state   map[string]map[string]any // clientID → presence data
}

func newPresenceManager(conn *connection, idg *IDGenerator, session func() string) *presenceManager {
	return &presenceManager{
		conn:    conn,
		idg:     idg,
		session: session,
		state:   make(map[string]map[string]any),
	}
}

// set updates the client's presence.
func (p *presenceManager) set(ctx context.Context, payload map[string]any) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	if err := ValidatePayloadSize(data, MaxPresenceSize, "presence"); err != nil {
		return err
	}

	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        1,
			ID:       p.idg.Next("pres"),
			Resource: "presence",
			Method:   "set",
			Kind:     "request",
			Session:  p.session(),
			Ts:       &ts,
		},
		Payload: payload,
	}

	return p.conn.send(ctx, frame)
}

// handleFrame processes presence.updated events.
func (p *presenceManager) handleFrame(f *Frame) {
	if f.Header.Resource != "presence" || f.Header.Method != "updated" {
		return
	}
	from := f.Header.From
	if from == "" {
		return
	}

	p.mu.Lock()
	p.state[from] = f.Payload
	p.mu.Unlock()
}

// get returns the presence data for a given client.
func (p *presenceManager) get(clientID string) map[string]any {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.state[clientID]
}

// getAll returns a copy of the full presence map.
func (p *presenceManager) getAll() map[string]map[string]any {
	p.mu.RLock()
	defer p.mu.RUnlock()
	out := make(map[string]map[string]any, len(p.state))
	for k, v := range p.state {
		out[k] = v
	}
	return out
}

// clear resets the presence state.
func (p *presenceManager) clear() {
	p.mu.Lock()
	p.state = make(map[string]map[string]any)
	p.mu.Unlock()
}
