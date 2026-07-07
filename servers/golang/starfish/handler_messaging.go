package starfish

func (h *Handler) handleClientSend(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	targets, err := ParseTo(f.To)
	if err != nil || len(targets) == 0 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
		return
	}

	for _, targetID := range targets {
		target := sess.GetClient(targetID)
		if target == nil {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrClientNotFound, nil))
			return
		}

		target.SendFrame(&Frame{
			V:       1,
			ID:      f.ID,
			Type:    "client.message",
			Session: f.Session,
			From:    c.id,
			To:      f.To,
			Payload: f.Payload,
		})
	}
}

func (h *Handler) handleSessionBroadcast(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
		return
	}

	excludeID := c.id
	if f.IncludeSelf() {
		excludeID = ""
	}

	sess.Broadcast(&Frame{
		V:       1,
		ID:      f.ID,
		Type:    "session.broadcast",
		Session: f.Session,
		From:    c.id,
		Payload: f.Payload,
	}, excludeID)
}
