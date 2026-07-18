package starfish

func (h *Handler) handleClientSend(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "message", "send", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	targets, err := ParseTo(f.Header.To)
	if err != nil || len(targets) == 0 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "message", "send", ErrProtocolInvalidFrame, nil))
		return
	}

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "message", "send", ErrSessionNotFound, nil))
		return
	}

	for _, targetID := range targets {
		target := sess.GetClient(targetID)
		if target == nil {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "message", "send", ErrClientNotFound, nil))
			return
		}

		target.SendFrame(&Frame{
			Header: Header{
				ID:       f.Header.ID,
				Resource: "message",
				Method:   "message",
				Kind:     "event",
				Session:  f.Header.Session,
				From:     c.id,
				To:       f.Header.To,
			},
			Payload: f.Payload,
		})
	}
}

func (h *Handler) handleSessionBroadcast(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "broadcast", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "broadcast", ErrSessionNotFound, nil))
		return
	}

	excludeID := c.id
	if f.IncludeSelf() {
		excludeID = ""
	}

	sess.Broadcast(&Frame{
		Header: Header{
			ID:       f.Header.ID,
			Resource: "session",
			Method:   "broadcast",
			Kind:     "event",
			Session:  f.Header.Session,
			From:     c.id,
		},
		Payload: f.Payload,
	}, excludeID)
}
