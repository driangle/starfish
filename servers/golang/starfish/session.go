package starfish

import (
	"sync"
)

// Session represents a named realtime room.
type Session struct {
	mu       sync.RWMutex
	name     string
	clients  map[string]*Client            // clientId -> *Client
	topics   map[string]map[string]*Client  // topicName -> clientId -> *Client
	data     *DataStore
	presence *PresenceThrottle
}

// NewSession creates a new session with the given name.
func NewSession(name string, hub *Hub) *Session {
	s := &Session{
		name:    name,
		clients: make(map[string]*Client),
		topics:  make(map[string]map[string]*Client),
		data:    NewDataStore(),
	}
	s.presence = NewPresenceThrottle(s, hub)
	return s
}

// AddClient adds a client to the session. Returns the list of current clients.
func (s *Session) AddClient(c *Client) []ClientInfo {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.clients[c.id] = c

	clients := make([]ClientInfo, 0, len(s.clients))
	for _, cl := range s.clients {
		clients = append(clients, cl.Info())
	}
	return clients
}

// RemoveClient removes a client from the session.
// Returns true if the session is now empty.
func (s *Session) RemoveClient(clientID string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	delete(s.clients, clientID)

	// Remove from all topic subscriptions
	for topic, subs := range s.topics {
		delete(subs, clientID)
		if len(subs) == 0 {
			delete(s.topics, topic)
		}
	}

	return len(s.clients) == 0
}

// GetClient returns the client with the given ID, or nil.
func (s *Session) GetClient(clientID string) *Client {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.clients[clientID]
}

// HasClient returns whether the client is in this session.
func (s *Session) HasClient(clientID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, ok := s.clients[clientID]
	return ok
}

// Broadcast sends a frame to all clients in the session, optionally excluding one.
func (s *Session) Broadcast(f *Frame, excludeID string) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	for id, c := range s.clients {
		if id != excludeID {
			c.SendFrame(f)
		}
	}
}

// Subscribe adds a client to a topic. Returns the current subscriber list.
func (s *Session) Subscribe(topicName string, c *Client) []string {
	s.mu.Lock()
	defer s.mu.Unlock()

	subs, ok := s.topics[topicName]
	if !ok {
		subs = make(map[string]*Client)
		s.topics[topicName] = subs
	}
	subs[c.id] = c

	ids := make([]string, 0, len(subs))
	for id := range subs {
		ids = append(ids, id)
	}
	return ids
}

// Unsubscribe removes a client from a topic. Returns the current subscriber list.
func (s *Session) Unsubscribe(topicName string, clientID string) []string {
	s.mu.Lock()
	defer s.mu.Unlock()

	subs, ok := s.topics[topicName]
	if !ok {
		return nil
	}
	delete(subs, clientID)
	if len(subs) == 0 {
		delete(s.topics, topicName)
		return nil
	}

	ids := make([]string, 0, len(subs))
	for id := range subs {
		ids = append(ids, id)
	}
	return ids
}

// IsSubscribed returns whether a client is subscribed to a topic.
func (s *Session) IsSubscribed(topicName string, clientID string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	subs, ok := s.topics[topicName]
	if !ok {
		return false
	}
	_, ok = subs[clientID]
	return ok
}

// GetSubscribers returns the clients subscribed to a topic.
func (s *Session) GetSubscribers(topicName string) []*Client {
	s.mu.RLock()
	defer s.mu.RUnlock()

	subs, ok := s.topics[topicName]
	if !ok {
		return nil
	}

	clients := make([]*Client, 0, len(subs))
	for _, c := range subs {
		clients = append(clients, c)
	}
	return clients
}

// GetTopicSubscriberIDs returns the subscriber IDs for a topic.
func (s *Session) GetTopicSubscriberIDs(topicName string) []string {
	s.mu.RLock()
	defer s.mu.RUnlock()

	subs, ok := s.topics[topicName]
	if !ok {
		return nil
	}

	ids := make([]string, 0, len(subs))
	for id := range subs {
		ids = append(ids, id)
	}
	return ids
}

// Close cleans up session resources.
func (s *Session) Close() {
	s.presence.Stop()
}
