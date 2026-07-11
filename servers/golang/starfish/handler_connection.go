package starfish

import (
	"encoding/json"
	"time"
)

type helloPayload struct {
	Client *struct {
		Name string          `json:"name"`
		Role string          `json:"role"`
		Meta json.RawMessage `json:"meta"`
	} `json:"client"`
	Capabilities *struct {
		RTC bool `json:"rtc"`
	} `json:"capabilities"`
	ResumeToken string `json:"resumeToken"`
}

type welcomePayload struct {
	ClientID          string     `json:"clientId"`
	Resumed           bool       `json:"resumed,omitempty"`
	ResumeToken       string     `json:"resumeToken"`
	ResumeTimeout     int64      `json:"resumeTimeout"`
	ServerTime        int64      `json:"serverTime"`
	HeartbeatInterval int64      `json:"heartbeatInterval"`
	SessionRequired   bool       `json:"sessionRequired,omitempty"`
	Sessions          []string   `json:"sessions,omitempty"`
	RTC               *rtcConfig `json:"rtc,omitempty"`
}

type rtcConfig struct {
	ICEServers []ICEServer `json:"iceServers"`
}

func (h *Handler) handleClientHello(c *Client, f *Frame) {
	var payload helloPayload
	if f.Payload != nil {
		if err := json.Unmarshal(f.Payload, &payload); err != nil {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
			return
		}
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
			c.authenticated = true
			c.lastActivity = now
			c.mu.Unlock()

			h.hub.RegisterClient(c)

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
			c.mu.Lock()
			// Store new token reference (not directly used, but could be tracked)
			c.mu.Unlock()

			wp := welcomePayload{
				ClientID:          c.id,
				Resumed:           true,
				ResumeToken:       newToken,
				ResumeTimeout:     h.hub.config.ResumeTimeout.Milliseconds(),
				ServerTime:        ts,
				HeartbeatInterval: h.hub.config.HeartbeatInterval.Milliseconds(),
				Sessions:          sessionNames,
			}

			if len(h.hub.config.ICEServers) > 0 {
				wp.RTC = &rtcConfig{ICEServers: h.hub.config.ICEServers}
			}

			payloadBytes, _ := json.Marshal(wp)
			c.SendFrame(&Frame{
				V:       1,
				ID:      h.hub.idGen.MessageID(),
				Type:    "server.welcome",
				Ts:      &ts,
				ReplyTo: f.ID,
				Payload: payloadBytes,
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
		c.meta = payload.Client.Meta
	}
	if payload.Capabilities != nil {
		c.rtcCapable = payload.Capabilities.RTC
	}
	c.authenticated = true
	c.lastActivity = now
	c.mu.Unlock()

	h.hub.RegisterClient(c)

	wp := welcomePayload{
		ClientID:          clientID,
		ResumeToken:       resumeToken,
		ResumeTimeout:     h.hub.config.ResumeTimeout.Milliseconds(),
		ServerTime:        ts,
		HeartbeatInterval: h.hub.config.HeartbeatInterval.Milliseconds(),
		SessionRequired:   true,
	}

	if len(h.hub.config.ICEServers) > 0 {
		wp.RTC = &rtcConfig{ICEServers: h.hub.config.ICEServers}
	}

	payloadBytes, _ := json.Marshal(wp)
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "server.welcome",
		Ts:      &ts,
		ReplyTo: f.ID,
		Payload: payloadBytes,
	})

	// Register resume token
	h.hub.resumes.RegisterToken(c, resumeToken)
}
