package starfish

import (
	"testing"
)

func TestSessionManager_HandleClientConnected(t *testing.T) {
	conn := newConnection(&IDGenerator{}, newEventBus())
	sm := newSessionManager(conn, &IDGenerator{})

	sm.mu.Lock()
	sm.session = "test-session"
	sm.clients = []ClientInfo{{ID: "client_1", Name: "first"}}
	sm.mu.Unlock()

	sm.handleFrame(&Frame{
		Header: Header{Resource: "client", Method: "connected"},
		Payload: map[string]any{
			"client": map[string]any{
				"id":   "client_2",
				"name": "second",
				"role": "performer",
			},
		},
	})

	clients := sm.getClients()
	if len(clients) != 2 {
		t.Fatalf("expected 2 clients, got %d", len(clients))
	}
	if clients[1].ID != "client_2" {
		t.Fatalf("expected client_2, got %s", clients[1].ID)
	}
}

func TestSessionManager_HandleClientDisconnected(t *testing.T) {
	conn := newConnection(&IDGenerator{}, newEventBus())
	sm := newSessionManager(conn, &IDGenerator{})

	sm.mu.Lock()
	sm.session = "test-session"
	sm.clients = []ClientInfo{
		{ID: "client_1", Name: "first"},
		{ID: "client_2", Name: "second"},
	}
	sm.mu.Unlock()

	sm.handleFrame(&Frame{
		Header:  Header{Resource: "client", Method: "disconnected"},
		Payload: map[string]any{"clientId": "client_1"},
	})

	clients := sm.getClients()
	if len(clients) != 1 {
		t.Fatalf("expected 1 client, got %d", len(clients))
	}
	if clients[0].ID != "client_2" {
		t.Fatalf("expected client_2, got %s", clients[0].ID)
	}
}

func TestSessionManager_IgnoresNonClientFrames(t *testing.T) {
	conn := newConnection(&IDGenerator{}, newEventBus())
	sm := newSessionManager(conn, &IDGenerator{})

	sm.mu.Lock()
	sm.clients = []ClientInfo{{ID: "client_1"}}
	sm.mu.Unlock()

	sm.handleFrame(&Frame{
		Header:  Header{Resource: "topic", Method: "message"},
		Payload: map[string]any{},
	})

	clients := sm.getClients()
	if len(clients) != 1 {
		t.Fatalf("expected 1 client unchanged, got %d", len(clients))
	}
}
