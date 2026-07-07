package starfish

import (
	"encoding/json"
)

func (h *Handler) handleTopicSubscribe(c *Client, f *Frame) {
	if f.Session == "" || f.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if len(f.Topic) > MaxTopicNameLen {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrTopicInvalid, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Session)

	subscribers := sess.Subscribe(f.Topic, c)

	// Track on the client
	c.mu.Lock()
	if c.topics[f.Session] == nil {
		c.topics[f.Session] = make(map[string]bool)
	}
	c.topics[f.Session][f.Topic] = true
	c.mu.Unlock()

	// Confirm subscription
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "topic.subscribed",
		Session: f.Session,
		Topic:   f.Topic,
		ReplyTo: f.ID,
	})

	// Send topic.peers to all subscribers
	h.sendTopicPeers(sess, f.Session, f.Topic, subscribers)
}

func (h *Handler) handleTopicUnsubscribe(c *Client, f *Frame) {
	if f.Session == "" || f.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Session)

	subscribers := sess.Unsubscribe(f.Topic, c.id)

	// Remove from client tracking
	c.mu.Lock()
	if topicSet, ok := c.topics[f.Session]; ok {
		delete(topicSet, f.Topic)
	}
	c.mu.Unlock()

	// Confirm unsubscription
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "topic.unsubscribed",
		Session: f.Session,
		Topic:   f.Topic,
		ReplyTo: f.ID,
	})

	// Send updated topic.peers to remaining subscribers
	if len(subscribers) > 0 {
		h.sendTopicPeers(sess, f.Session, f.Topic, subscribers)
	}
}

func (h *Handler) handleTopicPublish(c *Client, f *Frame) {
	if f.Session == "" || f.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Session)

	// Get subscribers and deliver as topic.message
	subscribers := sess.GetSubscribers(f.Topic)
	for _, sub := range subscribers {
		// Publisher does NOT receive own message unless subscribed
		// (the spec says: "The publisher does not receive its own message
		// unless it is also subscribed to the topic.")
		// Since we're iterating subscribers, the publisher will only
		// be in the list if subscribed. So we send to all subscribers.
		if sub.id == c.id {
			continue
		}
		sub.SendFrame(&Frame{
			V:       1,
			ID:      f.ID,
			Type:    "topic.message",
			Session: f.Session,
			From:    c.id,
			Topic:   f.Topic,
			Payload: f.Payload,
		})
	}
}

func (h *Handler) sendTopicPeers(sess *Session, sessionName string, topicName string, subscribers []string) {
	peersPayload, _ := json.Marshal(struct {
		Subscribers []string `json:"subscribers"`
	}{
		Subscribers: subscribers,
	})

	peersFrame := &Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "topic.peers",
		Session: sessionName,
		Topic:   topicName,
		Payload: peersPayload,
	}

	// Send to all clients in the session that are subscribed to this topic
	for _, c := range sess.GetSubscribers(topicName) {
		c.SendFrame(peersFrame)
	}
}

// requireSession checks that the client is in the specified session.
func (h *Handler) requireSession(c *Client, f *Frame) bool {
	c.mu.Lock()
	inSession := c.sessions[f.Session]
	c.mu.Unlock()

	if !inSession {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrSessionNotFound, nil))
		return false
	}
	return true
}
