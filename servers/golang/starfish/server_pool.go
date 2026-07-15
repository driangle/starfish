package starfish

// GetPool returns a pool by name, or nil.
func (h *Server) GetPool(name string) *Pool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.pools[name]
}

// GetOrCreatePool returns an existing pool or creates one.
func (h *Server) GetOrCreatePool(name string, mode PoolMode, groupSize int) *Pool {
	h.mu.Lock()
	defer h.mu.Unlock()

	if p, ok := h.pools[name]; ok {
		return p
	}

	p := NewPool(name, mode, groupSize, h)
	h.pools[name] = p
	return p
}

// RemovePool removes an empty pool.
func (h *Server) RemovePool(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.pools, name)
}
