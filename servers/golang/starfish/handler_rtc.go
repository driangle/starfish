package starfish

func (h *Handler) handleRTCConnect(c *Client, f *Frame) {
	h.relayRTC(c, f)
}

func (h *Handler) handleRTCOffer(c *Client, f *Frame) {
	h.relayRTC(c, f)
}

func (h *Handler) handleRTCAnswer(c *Client, f *Frame) {
	h.relayRTC(c, f)
}

func (h *Handler) handleRTCIce(c *Client, f *Frame) {
	h.relayRTC(c, f)
}

// relayRTC forwards an RTC signaling frame to the target peer.
// Both peers must be in the same session.
func (h *Handler) relayRTC(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	targets, err := ParseTo(f.To)
	if err != nil || len(targets) != 1 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	targetID := targets[0]

	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
		return
	}

	// Verify target is in the same session
	target := sess.GetClient(targetID)
	if target == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrClientNotFound, nil))
		return
	}

	// Forward with sender's ID
	relayed := *f
	relayed.From = c.id
	target.SendFrame(&relayed)
}
