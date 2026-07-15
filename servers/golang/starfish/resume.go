package starfish

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// ResumeEntry holds a disconnected client's state for potential reconnection.
type ResumeEntry struct {
	clientID   string
	token      string
	name       string
	role       string
	meta       json.RawMessage
	rtcCapable bool
	sessions   map[string]bool
	topics     map[string]map[string]bool
	presence   map[string]json.RawMessage
	timer      *time.Timer
}

// ResumeRegistry manages resume tokens and disconnected client state.
type ResumeRegistry struct {
	mu      sync.Mutex
	byToken map[string]*ResumeEntry
	// Track active tokens by clientID so we can invalidate on new connection
	byClient map[string]string // clientID -> token
	hub      *Server
}

// NewResumeRegistry creates a new ResumeRegistry.
func NewResumeRegistry(hub *Server) *ResumeRegistry {
	return &ResumeRegistry{
		byToken:  make(map[string]*ResumeEntry),
		byClient: make(map[string]string),
		hub:      hub,
	}
}

// RegisterToken associates a resume token with a client for future reconnection.
func (r *ResumeRegistry) RegisterToken(c *Client, token string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Invalidate any previous token for this client
	if oldToken, ok := r.byClient[c.id]; ok {
		if entry, ok := r.byToken[oldToken]; ok {
			if entry.timer != nil {
				entry.timer.Stop()
			}
			delete(r.byToken, oldToken)
		}
	}

	r.byClient[c.id] = token
}

// Store saves a disconnected client's state and starts the resume timeout.
func (r *ResumeRegistry) Store(c *Client) {
	r.mu.Lock()

	token, hasToken := r.byClient[c.id]
	if !hasToken {
		r.mu.Unlock()
		// No token registered -- client never completed handshake, just clean up
		r.expireClient(c)
		return
	}

	c.mu.Lock()
	entry := &ResumeEntry{
		clientID:   c.id,
		token:      token,
		name:       c.name,
		role:       c.role,
		meta:       c.meta,
		rtcCapable: c.rtcCapable,
		sessions:   copyStringBoolMap(c.sessions),
		topics:     copyTopicsMap(c.topics),
		presence:   copyPresenceMap(c.presence),
	}
	c.mu.Unlock()

	entry.timer = time.AfterFunc(r.hub.config.ResumeTimeout, func() {
		r.expire(token)
	})

	r.byToken[token] = entry
	r.mu.Unlock()

	log.Printf("client %s disconnected, holding state for %v", c.id, r.hub.config.ResumeTimeout)
}

// Restore attempts to restore a client's state using a resume token.
// Returns nil if the token is invalid or expired.
func (r *ResumeRegistry) Restore(token string) *ResumeEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.byToken[token]
	if !ok {
		return nil
	}

	// Stop the expiry timer
	entry.timer.Stop()
	delete(r.byToken, token)
	delete(r.byClient, entry.clientID)

	log.Printf("client %s resumed successfully", entry.clientID)
	return entry
}

// expire is called when a resume timeout fires.
func (r *ResumeRegistry) expire(token string) {
	r.mu.Lock()
	entry, ok := r.byToken[token]
	if !ok {
		r.mu.Unlock()
		return
	}
	delete(r.byToken, token)
	delete(r.byClient, entry.clientID)
	r.mu.Unlock()

	log.Printf("client %s resume expired, cleaning up", entry.clientID)

	// Broadcast client.disconnected to all sessions
	for sessName := range entry.sessions {
		sess := r.hub.GetSession(sessName)
		if sess == nil {
			continue
		}

		empty := sess.RemoveClient(entry.clientID)

		dcPayload, _ := json.Marshal(struct {
			ClientID string `json:"clientId"`
			Reason   string `json:"reason"`
		}{
			ClientID: entry.clientID,
			Reason:   "timeout",
		})

		sess.Broadcast(&Frame{
			V:       1,
			ID:      r.hub.idGen.MessageID(),
			Type:    "client.disconnected",
			Session: sessName,
			Payload: dcPayload,
		}, "")

		if empty {
			r.hub.RemoveSession(sessName)
		}
	}
}

// expireClient cleans up a client that had no resume token.
func (r *ResumeRegistry) expireClient(c *Client) {
	c.mu.Lock()
	sessions := copyStringBoolMap(c.sessions)
	c.mu.Unlock()

	for sessName := range sessions {
		sess := r.hub.GetSession(sessName)
		if sess == nil {
			continue
		}

		empty := sess.RemoveClient(c.id)

		dcPayload, _ := json.Marshal(struct {
			ClientID string `json:"clientId"`
			Reason   string `json:"reason"`
		}{
			ClientID: c.id,
			Reason:   "left",
		})

		sess.Broadcast(&Frame{
			V:       1,
			ID:      r.hub.idGen.MessageID(),
			Type:    "client.disconnected",
			Session: sessName,
			Payload: dcPayload,
		}, "")

		if empty {
			r.hub.RemoveSession(sessName)
		}
	}
}
