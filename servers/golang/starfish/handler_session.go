package starfish

type joinPayload struct {
	Create bool           `json:"create"`
	Name   string         `json:"name"`
	Role   string         `json:"role"`
	Meta   map[string]any `json:"meta"`
}

func (h *Handler) handleSessionJoin(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "join", ErrProtocolInvalidFrame, nil))
		return
	}

	payload, err := payloadAs[joinPayload](f)
	if err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "join", ErrProtocolInvalidFrame, nil))
		return
	}

	// Check if session exists
	sess := h.hub.GetSession(f.Header.Session)
	if sess == nil {
		if !payload.Create {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "join", ErrSessionNotFound, nil))
			return
		}
		sess = h.hub.GetOrCreateSession(f.Header.Session)
	}

	// Add client to session
	clients := sess.AddClient(c)

	c.mu.Lock()
	c.sessions[f.Header.Session] = true
	if payload.Name != "" {
		c.name = payload.Name
	}
	if payload.Role != "" {
		c.role = payload.Role
	}
	if payload.Meta != nil {
		c.meta = marshalRaw(payload.Meta)
	}
	c.mu.Unlock()

	// Send session join response
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "session",
			Method:   "join",
			Kind:     "response",
			Session:  f.Header.Session,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status":   "ok",
			"clientId": c.id,
			"clients":  clients,
		},
	})

	// Broadcast session connected event to other clients
	sess.Broadcast(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "session",
			Method:   "connected",
			Kind:     "event",
			Session:  f.Header.Session,
		},
		Payload: map[string]any{
			"client": c.Info(),
		},
	}, c.id) // Exclude the joining client
}

func (h *Handler) handleSessionLeave(c *Client, f *Frame) {
	if f.Header.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "leave", ErrProtocolInvalidFrame, nil))
		return
	}

	c.mu.Lock()
	inSession := c.sessions[f.Header.Session]
	c.mu.Unlock()

	if !inSession {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "session", "leave", ErrSessionNotFound, nil))
		return
	}

	h.removeClientFromSession(c, f.Header.Session, "left")

	// Confirm to the client
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "session",
			Method:   "leave",
			Kind:     "response",
			Session:  f.Header.Session,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status": "ok",
		},
	})
}

// removeClientFromSession removes a client from a session and broadcasts the disconnect.
func (h *Handler) removeClientFromSession(c *Client, sessionName string, reason string) {
	sess := h.hub.GetSession(sessionName)
	if sess == nil {
		return
	}

	c.mu.Lock()
	delete(c.sessions, sessionName)
	delete(c.topics, sessionName)
	delete(c.presence, sessionName)
	c.mu.Unlock()

	empty := sess.RemoveClient(c.id)

	// Broadcast session disconnected event
	sess.Broadcast(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "session",
			Method:   "disconnected",
			Kind:     "event",
			Session:  sessionName,
		},
		Payload: map[string]any{
			"clientId": c.id,
			"reason":   reason,
		},
	}, "")

	if empty {
		h.hub.RemoveSession(sessionName)
	}
}
