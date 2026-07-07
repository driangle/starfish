package starfish

func (h *Handler) handlePresenceSet(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	if len(f.Payload) > MaxPresenceSize {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPayloadTooLarge, nil))
		return
	}

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		return
	}

	// Store presence on the client for resume
	c.mu.Lock()
	c.presence[f.Session] = f.Payload
	c.mu.Unlock()

	// Enqueue for throttled broadcast
	sess.presence.Set(c.id, f.Payload)
}
