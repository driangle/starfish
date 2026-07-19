package starfish

import (
	"context"
	"sync"
	"time"
)

// JoinOptions configures a session join request.
type JoinOptions struct {
	Create bool
	Name   string
	Role   string
	Meta   map[string]any
}

// JoinResult is the server's response to a session join.
type JoinResult struct {
	ClientID string
	Clients  []ClientInfo
}

// sessionManager handles session join/leave and client tracking.
type sessionManager struct {
	mu      sync.RWMutex
	conn    *connection
	idg     *IDGenerator
	session string
	clients []ClientInfo
}

func newSessionManager(conn *connection, idg *IDGenerator) *sessionManager {
	return &sessionManager{
		conn: conn,
		idg:  idg,
	}
}

// join sends a session.join request and returns the result.
func (s *sessionManager) join(ctx context.Context, session string, opts *JoinOptions) (*JoinResult, error) {
	ts := time.Now().UnixMilli()
	payload := map[string]any{}
	if opts != nil {
		if opts.Create {
			payload["create"] = true
		}
		if opts.Name != "" {
			payload["name"] = opts.Name
		}
		if opts.Role != "" {
			payload["role"] = opts.Role
		}
		if opts.Meta != nil {
			payload["meta"] = opts.Meta
		}
	}

	frame := &Frame{
		Header: Header{
			V:        2,
			ID:       s.idg.Next("session"),
			Resource: "session",
			Method:   "join",
			Kind:     "request",
			Session:  session,
			Ts:       &ts,
		},
		Payload: payload,
	}

	reply, err := s.conn.sendAndWait(ctx, frame, 0)
	if err != nil {
		return nil, err
	}

	result := &JoinResult{}
	if v, ok := reply.Payload["clientId"].(string); ok {
		result.ClientID = v
	}
	if clientsRaw, ok := reply.Payload["clients"].([]any); ok {
		for _, c := range clientsRaw {
			if cm, ok := c.(map[string]any); ok {
				info := ClientInfo{}
				if v, ok := cm["id"].(string); ok {
					info.ID = v
				}
				if v, ok := cm["name"].(string); ok {
					info.Name = v
				}
				if v, ok := cm["role"].(string); ok {
					info.Role = v
				}
				if v, ok := cm["meta"].(map[string]any); ok {
					info.Meta = v
				}
				result.Clients = append(result.Clients, info)
			}
		}
	}

	s.mu.Lock()
	s.session = session
	s.clients = result.Clients
	s.mu.Unlock()

	return result, nil
}

// leave sends a session.leave request.
func (s *sessionManager) leave(ctx context.Context) error {
	s.mu.RLock()
	session := s.session
	s.mu.RUnlock()

	if session == "" {
		return nil
	}

	ts := time.Now().UnixMilli()
	frame := &Frame{
		Header: Header{
			V:        2,
			ID:       s.idg.Next("session"),
			Resource: "session",
			Method:   "leave",
			Kind:     "request",
			Session:  session,
			Ts:       &ts,
		},
	}

	err := s.conn.send(ctx, frame)

	s.mu.Lock()
	s.session = ""
	s.clients = nil
	s.mu.Unlock()

	return err
}

// handleFrame processes session-related events.
func (s *sessionManager) handleFrame(f *Frame) {
	if f.Header.Resource != "client" {
		return
	}

	switch f.Header.Method {
	case "connected":
		if clientRaw, ok := f.Payload["client"].(map[string]any); ok {
			info := ClientInfo{}
			if v, ok := clientRaw["id"].(string); ok {
				info.ID = v
			}
			if v, ok := clientRaw["name"].(string); ok {
				info.Name = v
			}
			if v, ok := clientRaw["role"].(string); ok {
				info.Role = v
			}
			if v, ok := clientRaw["meta"].(map[string]any); ok {
				info.Meta = v
			}
			s.mu.Lock()
			s.clients = append(s.clients, info)
			s.mu.Unlock()
		}
	case "disconnected":
		if clientID, ok := f.Payload["clientId"].(string); ok {
			s.mu.Lock()
			for i, c := range s.clients {
				if c.ID == clientID {
					s.clients = append(s.clients[:i], s.clients[i+1:]...)
					break
				}
			}
			s.mu.Unlock()
		}
	}
}

// currentSession returns the current session name.
func (s *sessionManager) currentSession() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.session
}

// getClients returns the current client list.
func (s *sessionManager) getClients() []ClientInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]ClientInfo, len(s.clients))
	copy(out, s.clients)
	return out
}
