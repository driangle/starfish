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
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "rtc", f.Header.Method, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	targets, err := ParseTo(f.Header.To)
	if err != nil || len(targets) != 1 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "rtc", f.Header.Method, ErrProtocolInvalidFrame, nil))
		return
	}

	targetID := targets[0]

	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "rtc", f.Header.Method, ErrSessionNotFound, nil))
		return
	}

	// Verify target is in the same session
	target := sess.GetClient(targetID)
	if target == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "rtc", f.Header.Method, ErrClientNotFound, nil))
		return
	}

	// Forward with sender's ID
	relayed := *f
	relayed.Header.From = c.id
	target.SendFrame(&relayed)
}
