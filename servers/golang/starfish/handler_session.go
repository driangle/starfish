package starfish

import (
	"encoding/json"
)

type joinPayload struct {
	Create bool            `json:"create"`
	Name   string          `json:"name"`
	Role   string          `json:"role"`
	Meta   json.RawMessage `json:"meta"`
}

func (h *Handler) handleSessionJoin(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	var payload joinPayload
	if f.Payload != nil {
		if err := json.Unmarshal(f.Payload, &payload); err != nil {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
			return
		}
	}

	// Check if session exists
	sess := h.hub.GetSession(f.Session)
	if sess == nil {
		if !payload.Create {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
			return
		}
		sess = h.hub.GetOrCreateSession(f.Session)
	}

	// Add client to session
	clients := sess.AddClient(c)

	c.mu.Lock()
	c.sessions[f.Session] = true
	if payload.Name != "" {
		c.name = payload.Name
	}
	if payload.Role != "" {
		c.role = payload.Role
	}
	if payload.Meta != nil {
		c.meta = payload.Meta
	}
	c.mu.Unlock()

	// Send session.joined to the joining client
	joinedPayload, _ := json.Marshal(struct {
		ClientID string       `json:"clientId"`
		Clients  []ClientInfo `json:"clients"`
	}{
		ClientID: c.id,
		Clients:  clients,
	})

	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "session.joined",
		Session: f.Session,
		ReplyTo: f.ID,
		Payload: joinedPayload,
	})

	// Broadcast client.connected to other clients in the session
	connPayload, _ := json.Marshal(struct {
		Client ClientInfo `json:"client"`
	}{
		Client: c.Info(),
	})

	sess.Broadcast(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "client.connected",
		Session: f.Session,
		Payload: connPayload,
	}, c.id) // Exclude the joining client
}

func (h *Handler) handleSessionLeave(c *Client, f *Frame) {
	if f.Session == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	c.mu.Lock()
	inSession := c.sessions[f.Session]
	c.mu.Unlock()

	if !inSession {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
		return
	}

	h.removeClientFromSession(c, f.Session, "left")

	// Confirm to the client
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "session.left",
		Session: f.Session,
		ReplyTo: f.ID,
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

	// Broadcast client.disconnected
	dcPayload, _ := json.Marshal(struct {
		ClientID string `json:"clientId"`
		Reason   string `json:"reason"`
	}{
		ClientID: c.id,
		Reason:   reason,
	})

	sess.Broadcast(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "client.disconnected",
		Session: sessionName,
		Payload: dcPayload,
	}, "")

	if empty {
		h.hub.RemoveSession(sessionName)
	}
}
