package starfish

import "encoding/json"

func (h *Handler) handlePresenceSet(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "presence", "set", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	// Check payload size by marshaling it
	payloadBytes, _ := json.Marshal(f.Payload)
	if len(payloadBytes) > MaxPresenceSize {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "presence", "set", ErrPayloadTooLarge, nil))
		return
	}

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		return
	}

	// Store presence on the client for resume
	c.mu.Lock()
	c.presence[f.Header.Session] = payloadBytes
	c.mu.Unlock()

	// Enqueue for throttled broadcast
	sess.presence.Set(c.id, payloadBytes)
}
