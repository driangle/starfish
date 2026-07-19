package starfish

import (
	"testing"
)

func TestNewClient_DefaultState(t *testing.T) {
	client := NewClient(ClientOptions{Server: "ws://localhost:8080/starfish"})

	if client.State() != Disconnected {
		t.Fatalf("expected disconnected state, got %s", client.State())
	}
	if client.ClientID() != "" {
		t.Fatalf("expected empty clientID, got %s", client.ClientID())
	}
}

func TestClient_Peers_ExcludesSelf(t *testing.T) {
	client := NewClient(ClientOptions{Server: "ws://localhost:8080/starfish"})

	// Simulate joined state
	client.mu.Lock()
	client.clientID = "client_1"
	client.mu.Unlock()

	client.session.mu.Lock()
	client.session.clients = []ClientInfo{
		{ID: "client_1", Name: "self"},
		{ID: "client_2", Name: "peer"},
	}
	client.session.mu.Unlock()

	peers := client.Peers()
	if len(peers) != 1 {
		t.Fatalf("expected 1 peer, got %d", len(peers))
	}
	if peers[0].ID != "client_2" {
		t.Fatalf("expected peer client_2, got %s", peers[0].ID)
	}
}

func TestClient_OnConnectionChange(t *testing.T) {
	client := NewClient(ClientOptions{Server: "ws://localhost:8080/starfish"})

	var states []ConnectionState
	unsub := client.OnConnectionChange(func(s ConnectionState) {
		states = append(states, s)
	})

	client.setState(Connecting)
	client.setState(Connected)

	unsub()
	client.setState(Disconnected)

	if len(states) != 2 {
		t.Fatalf("expected 2 state changes, got %d", len(states))
	}
	if states[0] != Connecting || states[1] != Connected {
		t.Fatalf("unexpected states: %v", states)
	}
}

func TestClient_PresenceTracking(t *testing.T) {
	client := NewClient(ClientOptions{Server: "ws://localhost:8080/starfish"})

	// Simulate incoming presence update
	client.presence.handleFrame(&Frame{
		Header:  Header{Resource: "presence", Method: "updated", From: "peer_1"},
		Payload: map[string]any{"x": 0.5, "y": 0.8},
	})

	p := client.Presence("peer_1")
	if p == nil {
		t.Fatal("expected presence data for peer_1")
	}
	if p["x"] != 0.5 {
		t.Fatalf("unexpected x: %v", p["x"])
	}

	all := client.PresenceAll()
	if len(all) != 1 {
		t.Fatalf("expected 1 presence entry, got %d", len(all))
	}
}
