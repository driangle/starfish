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
	pools      map[string]*ResumePoolEntry
	timer      *time.Timer
}

// ResumeRegistry manages resume tokens and disconnected client state.
type ResumeRegistry struct {
	mu       sync.Mutex
	byToken  map[string]*ResumeEntry
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
		r.expireClient(c)
		return
	}

	c.mu.Lock()
	poolNames := copyStringBoolMap(c.pools)
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

	entry.pools = r.snapshotPoolState(c.id, poolNames)

	entry.timer = time.AfterFunc(r.hub.config.ResumeTimeout, func() {
		r.expire(token)
	})

	r.byToken[token] = entry
	r.mu.Unlock()

	log.Printf("client %s disconnected, holding state for %v", c.id, r.hub.config.ResumeTimeout)
}

// Restore attempts to restore a client's state using a resume token.
func (r *ResumeRegistry) Restore(token string) *ResumeEntry {
	r.mu.Lock()
	defer r.mu.Unlock()

	entry, ok := r.byToken[token]
	if !ok {
		return nil
	}

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

	r.expireSessions(entry.clientID, entry.sessions, "timeout")
	r.expirePoolMemberships(entry.clientID, entry.pools, "timeout")
}

// expireClient cleans up a client that had no resume token.
func (r *ResumeRegistry) expireClient(c *Client) {
	c.mu.Lock()
	sessions := copyStringBoolMap(c.sessions)
	pools := copyStringBoolMap(c.pools)
	c.mu.Unlock()

	r.expireSessions(c.id, sessions, "left")
	r.expirePoolMembershipsByName(c.id, pools, "disconnected")
}

// expireSessions broadcasts client.disconnected and removes from all sessions.
func (r *ResumeRegistry) expireSessions(clientID string, sessions map[string]bool, reason string) {
	for sessName := range sessions {
		sess := r.hub.GetSession(sessName)
		if sess == nil {
			continue
		}

		empty := sess.RemoveClient(clientID)

		dcPayload, _ := json.Marshal(struct {
			ClientID string `json:"clientId"`
			Reason   string `json:"reason"`
		}{
			ClientID: clientID,
			Reason:   reason,
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
