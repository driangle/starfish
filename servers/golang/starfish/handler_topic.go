package starfish

func (h *Handler) handleTopicSubscribe(c *Client, f *Frame) {
	if f.Header.Session == "" || f.Header.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "topic", "subscribe", ErrProtocolInvalidFrame, nil))
		return
	}

	if len(f.Header.Topic) > MaxTopicNameLen {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "topic", "subscribe", ErrTopicInvalid, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Header.Session)

	subscribers := sess.Subscribe(f.Header.Topic, c)

	// Track on the client
	c.mu.Lock()
	if c.topics[f.Header.Session] == nil {
		c.topics[f.Header.Session] = make(map[string]bool)
	}
	c.topics[f.Header.Session][f.Header.Topic] = true
	c.mu.Unlock()

	// Confirm subscription
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "topic",
			Method:   "subscribe",
			Kind:     "response",
			Session:  f.Header.Session,
			Topic:    f.Header.Topic,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status": "ok",
		},
	})

	// Send topic peers event to all subscribers
	h.sendTopicPeers(sess, f.Header.Session, f.Header.Topic, subscribers)
}

func (h *Handler) handleTopicUnsubscribe(c *Client, f *Frame) {
	if f.Header.Session == "" || f.Header.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "topic", "unsubscribe", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Header.Session)

	subscribers := sess.Unsubscribe(f.Header.Topic, c.id)

	// Remove from client tracking
	c.mu.Lock()
	if topicSet, ok := c.topics[f.Header.Session]; ok {
		delete(topicSet, f.Header.Topic)
	}
	c.mu.Unlock()

	// Confirm unsubscription
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "topic",
			Method:   "unsubscribe",
			Kind:     "response",
			Session:  f.Header.Session,
			Topic:    f.Header.Topic,
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status": "ok",
		},
	})

	// Send updated topic peers to remaining subscribers
	if len(subscribers) > 0 {
		h.sendTopicPeers(sess, f.Header.Session, f.Header.Topic, subscribers)
	}
}

func (h *Handler) handleTopicPublish(c *Client, f *Frame) {
	if f.Header.Session == "" || f.Header.Topic == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "topic", "publish", ErrProtocolInvalidFrame, nil))
		return
	}

	if !h.requireSession(c, f) {
		return
	}

	sess := h.hub.GetSession(f.Header.Session)

	subscribers := sess.GetSubscribers(f.Header.Topic)
	for _, sub := range subscribers {
		sub.SendFrame(&Frame{
			Header: Header{
				ID:       f.Header.ID,
				Resource: "topic",
				Method:   "message",
				Kind:     "event",
				Session:  f.Header.Session,
				From:     c.id,
				Topic:    f.Header.Topic,
			},
			Payload: f.Payload,
		})
	}
}

func (h *Handler) sendTopicPeers(sess *Session, sessionName string, topicName string, subscribers []string) {
	peersFrame := &Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "topic",
			Method:   "peers",
			Kind:     "event",
			Session:  sessionName,
			Topic:    topicName,
		},
		Payload: map[string]any{
			"subscribers": subscribers,
		},
	}

	// Send to all clients in the session that are subscribed to this topic
	for _, c := range sess.GetSubscribers(topicName) {
		c.SendFrame(peersFrame)
	}
}

// requireSession checks that the client is in the specified session.
func (h *Handler) requireSession(c *Client, f *Frame) bool {
	c.mu.Lock()
	inSession := c.sessions[f.Header.Session]
	c.mu.Unlock()

	if !inSession {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, f.Header.Resource, f.Header.Method, ErrSessionNotFound, nil))
		return false
	}
	return true
}
