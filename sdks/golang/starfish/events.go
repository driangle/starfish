package starfish

import "sync"

// Handler is a callback that receives frames.
type Handler func(*Frame)

// Unsubscribe removes a registered handler.
type Unsubscribe func()

// eventBus manages frame dispatch to filtered handlers.
type eventBus struct {
	mu       sync.RWMutex
	handlers map[uint64]filteredHandler
	nextID   uint64
}

type filteredHandler struct {
	filter  EventFilter
	handler Handler
}

func newEventBus() *eventBus {
	return &eventBus{
		handlers: make(map[uint64]filteredHandler),
	}
}

// on registers a handler with an optional filter. Returns an unsubscribe function.
func (e *eventBus) on(filter EventFilter, handler Handler) Unsubscribe {
	e.mu.Lock()
	id := e.nextID
	e.nextID++
	e.handlers[id] = filteredHandler{filter: filter, handler: handler}
	e.mu.Unlock()

	return func() {
		e.mu.Lock()
		delete(e.handlers, id)
		e.mu.Unlock()
	}
}

// dispatch sends a frame to all matching handlers.
func (e *eventBus) dispatch(f *Frame) {
	e.mu.RLock()
	// Copy handlers to release lock before calling them
	var matched []Handler
	for _, fh := range e.handlers {
		if matchesFilter(f, fh.filter) {
			matched = append(matched, fh.handler)
		}
	}
	e.mu.RUnlock()

	for _, h := range matched {
		h(f)
	}
}

func matchesFilter(f *Frame, filter EventFilter) bool {
	if filter.Resource != "" && f.Header.Resource != filter.Resource {
		return false
	}
	if filter.Method != "" && f.Header.Method != filter.Method {
		return false
	}
	if filter.Topic != "" && f.Header.Topic != filter.Topic {
		return false
	}
	if filter.From != "" && f.Header.From != filter.From {
		return false
	}
	return true
}
