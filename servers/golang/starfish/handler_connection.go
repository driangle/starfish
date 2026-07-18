package starfish

import (
	"encoding/json"
	"time"
)

type helloPayload struct {
	Versions []int `json:"versions"`
	Client   *struct {
		Name string         `json:"name"`
		Role string         `json:"role"`
		Meta map[string]any `json:"meta"`
	} `json:"client"`
	Capabilities *struct {
		RTC bool `json:"rtc"`
	} `json:"capabilities"`
	ResumeToken string `json:"resumeToken"`
}

func (h *Handler) handleClientHello(c *Client, f *Frame) {
	payload, err := payloadAs[helloPayload](f)
	if err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "client", "welcome", ErrProtocolInvalidFrame, nil))
		return
	}

	// Version negotiation: check that client supports v2
	if !versionSupported(payload.Versions) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "client", "welcome", ErrProtocolUnsupportedVer, nil))
		return
	}

	now := time.Now()
	ts := now.UnixMilli()

	// Try resume
	if payload.ResumeToken != "" {
		entry := h.hub.resumes.Restore(payload.ResumeToken)
		if entry != nil {
			// Successful resume
			c.mu.Lock()
			c.id = entry.clientID
			c.name = entry.name
			c.role = entry.role
			c.meta = entry.meta
			c.rtcCapable = entry.rtcCapable
			c.sessions = entry.sessions
			c.topics = entry.topics
			c.presence = entry.presence
			c.pools = make(map[string]bool)
			for poolName := range entry.pools {
				c.pools[poolName] = true
			}
			c.authenticated = true
			c.lastActivity = now
			c.mu.Unlock()

			h.hub.RegisterClient(c)

			// Re-add client to pools
			for poolName, poolEntry := range entry.pools {
				pool := h.hub.GetPool(poolName)
				if pool != nil {
					pool.RestoreMember(c, poolEntry.Attributes, poolEntry.Filter, poolEntry.Role)
				}
			}

			// Re-add client to sessions
			sessionNames := make([]string, 0, len(c.sessions))
			for sessName := range c.sessions {
				sess := h.hub.GetSession(sessName)
				if sess != nil {
					sess.AddClient(c)
					// Re-subscribe to topics
					if topicSet, ok := c.topics[sessName]; ok {
						for topicName := range topicSet {
							sess.Subscribe(topicName, c)
						}
					}
				}
				sessionNames = append(sessionNames, sessName)
			}

			newToken := h.hub.idGen.ResumeToken()

			wp := map[string]any{
				"status":            "ok",
				"version":           2,
				"clientId":          c.id,
				"resumed":           true,
				"resumeToken":       newToken,
				"resumeTimeout":     h.hub.config.ResumeTimeout.Milliseconds(),
				"serverTime":        ts,
				"heartbeatInterval": h.hub.config.HeartbeatInterval.Milliseconds(),
				"sessions":          sessionNames,
			}

			if len(h.hub.config.ICEServers) > 0 {
				wp["rtc"] = map[string]any{
					"iceServers": h.hub.config.ICEServers,
				}
			}

			c.SendFrame(&Frame{
				Header: Header{
					ID:       h.hub.idGen.MessageID(),
					Resource: "client",
					Method:   "welcome",
					Kind:     "response",
					V:        2,
					Ts:       &ts,
					ReplyTo:  f.Header.ID,
				},
				Payload: wp,
			})

			// Register new resume token
			h.hub.resumes.RegisterToken(c, newToken)
			return
		}
		// Resume failed -- fall through to fresh connection
	}

	// Fresh connection
	clientID := h.hub.idGen.ClientID()
	resumeToken := h.hub.idGen.ResumeToken()

	c.mu.Lock()
	c.id = clientID
	if payload.Client != nil {
		c.name = payload.Client.Name
		c.role = payload.Client.Role
		if payload.Client.Meta != nil {
			c.meta = marshalRaw(payload.Client.Meta)
		}
	}
	if payload.Capabilities != nil {
		c.rtcCapable = payload.Capabilities.RTC
	}
	c.authenticated = true
	c.lastActivity = now
	c.mu.Unlock()

	h.hub.RegisterClient(c)

	wp := map[string]any{
		"status":            "ok",
		"version":           2,
		"clientId":          clientID,
		"resumeToken":       resumeToken,
		"resumeTimeout":     h.hub.config.ResumeTimeout.Milliseconds(),
		"serverTime":        ts,
		"heartbeatInterval": h.hub.config.HeartbeatInterval.Milliseconds(),
		"sessionRequired":   true,
	}

	if len(h.hub.config.ICEServers) > 0 {
		wp["rtc"] = map[string]any{
			"iceServers": h.hub.config.ICEServers,
		}
	}

	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "client",
			Method:   "welcome",
			Kind:     "response",
			V:        2,
			Ts:       &ts,
			ReplyTo:  f.Header.ID,
		},
		Payload: wp,
	})

	// Register resume token
	h.hub.resumes.RegisterToken(c, resumeToken)
}

// versionSupported checks if the client's version list includes v2.
// If no versions are provided, we accept (backwards compat during transition).
func versionSupported(versions []int) bool {
	if len(versions) == 0 {
		return true
	}
	for _, v := range versions {
		if v == 2 {
			return true
		}
	}
	return false
}

// marshalRaw converts a map to json.RawMessage for storage.
func marshalRaw(v any) []byte {
	data, _ := json.Marshal(v)
	return data
}
