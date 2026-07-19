package starfish

import (
	"sync"
	"time"
)

// pendingEntry holds the response channel and timeout timer for a pending request.
type pendingEntry struct {
	ch    chan *Frame
	timer *time.Timer
}

// pendingRequests tracks in-flight request-reply correlations.
type pendingRequests struct {
	mu      sync.Mutex
	entries map[string]*pendingEntry
}

func newPendingRequests() *pendingRequests {
	return &pendingRequests{
		entries: make(map[string]*pendingEntry),
	}
}

// add registers a pending request and returns a channel that will receive the reply.
func (p *pendingRequests) add(id string, timeout time.Duration) <-chan *Frame {
	ch := make(chan *Frame, 1)
	timer := time.AfterFunc(timeout, func() {
		p.mu.Lock()
		defer p.mu.Unlock()
		if entry, ok := p.entries[id]; ok {
			delete(p.entries, id)
			close(entry.ch)
		}
	})

	p.mu.Lock()
	p.entries[id] = &pendingEntry{ch: ch, timer: timer}
	p.mu.Unlock()

	return ch
}

// resolve attempts to match an incoming frame to a pending request via replyTo.
// Returns true if the frame was consumed.
func (p *pendingRequests) resolve(f *Frame) bool {
	replyTo := f.Header.ReplyTo
	if replyTo == "" {
		return false
	}

	p.mu.Lock()
	entry, ok := p.entries[replyTo]
	if ok {
		delete(p.entries, replyTo)
	}
	p.mu.Unlock()

	if !ok {
		return false
	}

	entry.timer.Stop()
	entry.ch <- f
	return true
}

// rejectAll closes all pending request channels (used on disconnect).
func (p *pendingRequests) rejectAll() {
	p.mu.Lock()
	entries := p.entries
	p.entries = make(map[string]*pendingEntry)
	p.mu.Unlock()

	for _, entry := range entries {
		entry.timer.Stop()
		close(entry.ch)
	}
}
