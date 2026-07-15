package starfish

import (
	"log"
	"net/http"
	"sync"
	"time"

	"nhooyr.io/websocket"
)

// Config holds server configuration.
type Config struct {
	Addr               string
	HeartbeatInterval  time.Duration
	HeartbeatTimeout   time.Duration
	ResumeTimeout      time.Duration
	PresenceThrottleMs int
	MaxWSMessageSize   int64
	ICEServers         []ICEServer
}

// ICEServer is a STUN/TURN server configuration.
type ICEServer struct {
	URLs string `json:"urls"`
}

// DefaultConfig returns a Config with spec-recommended defaults.
func DefaultConfig() *Config {
	return &Config{
		Addr:               ":8080",
		HeartbeatInterval:  15 * time.Second,
		HeartbeatTimeout:   30 * time.Second,
		ResumeTimeout:      30 * time.Second,
		PresenceThrottleMs: 50,
		MaxWSMessageSize:   MaxWSMessageSize,
		ICEServers: []ICEServer{
			{URLs: "stun:stun.l.google.com:19302"},
		},
	}
}

// Server is the central coordinator for all clients and sessions.
type Server struct {
	mu       sync.RWMutex
	clients  map[string]*Client  // clientId -> *Client
	sessions map[string]*Session // sessionName -> *Session
	pools    map[string]*Pool    // poolName -> *Pool
	resumes  *ResumeRegistry
	config   *Config
	idGen    *IDGenerator
	handler  *Handler
}

// NewServer creates a new Server with the given configuration.
func NewServer(config *Config) *Server {
	h := &Server{
		clients:  make(map[string]*Client),
		sessions: make(map[string]*Session),
		pools:    make(map[string]*Pool),
		config:   config,
		idGen:    NewIDGenerator(),
	}
	h.resumes = NewResumeRegistry(h)
	h.handler = NewHandler(h)
	return h
}

// ServeHTTP handles WebSocket upgrade requests at /starfish.
func (h *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // Accept all origins for dev; configure in production
	})
	if err != nil {
		log.Printf("websocket accept error: %v", err)
		return
	}

	client := NewClient(h, conn)
	go client.WritePump()
	go client.ReadPump()
}

// RegisterClient registers an authenticated client in the hub.
func (h *Server) RegisterClient(c *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[c.id] = c
}

// RemoveClient handles a client disconnect.
// Moves state to the resume registry and removes from sessions after timeout.
func (h *Server) RemoveClient(c *Client) {
	h.mu.Lock()
	_, registered := h.clients[c.id]
	if registered {
		delete(h.clients, c.id)
	}
	h.mu.Unlock()

	if !registered || c.id == "" {
		return
	}

	// Store state for potential reconnection
	h.resumes.Store(c)
}

// GetClient returns a registered client by ID, or nil.
func (h *Server) GetClient(clientID string) *Client {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.clients[clientID]
}

// GetSession returns a session by name, or nil.
func (h *Server) GetSession(name string) *Session {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.sessions[name]
}

// GetOrCreateSession returns an existing session or creates one.
func (h *Server) GetOrCreateSession(name string) *Session {
	h.mu.Lock()
	defer h.mu.Unlock()

	if s, ok := h.sessions[name]; ok {
		return s
	}

	s := NewSession(name, h)
	h.sessions[name] = s
	return s
}

// RemoveSession removes an empty session.
func (h *Server) RemoveSession(name string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if s, ok := h.sessions[name]; ok {
		s.Close()
		delete(h.sessions, name)
	}
}

// StartHeartbeatChecker starts a goroutine that checks for stale clients.
func (h *Server) StartHeartbeatChecker() {
	go func() {
		ticker := time.NewTicker(h.config.HeartbeatInterval)
		defer ticker.Stop()

		for range ticker.C {
			h.checkHeartbeats()
		}
	}()
}

func (h *Server) checkHeartbeats() {
	h.mu.RLock()
	clients := make([]*Client, 0, len(h.clients))
	for _, c := range h.clients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()

	now := time.Now()
	for _, c := range clients {
		c.mu.Lock()
		if !c.authenticated {
			c.mu.Unlock()
			continue
		}
		stale := now.Sub(c.lastActivity) > h.config.HeartbeatTimeout
		c.mu.Unlock()

		if stale {
			log.Printf("client %s heartbeat timeout", c.id)
			c.Close()
		}
	}
}
