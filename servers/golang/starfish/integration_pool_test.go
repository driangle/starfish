package starfish_test

import (
	"encoding/json"
	"testing"

	"github.com/driangle/starfish/servers/golang/starfish"
	"nhooyr.io/websocket"
)

func enterPool(t *testing.T, conn *websocket.Conn, id string, opts map[string]any) *starfish.Frame {
	t.Helper()
	payload, _ := json.Marshal(opts)
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      id,
		Type:    "pool.enter",
		Payload: payload,
	})
	return readFrame(t, conn)
}

func TestPoolAutoMode(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "player-a")

	conn2 := env.connect(t)
	hello(t, conn2, "player-b")

	entered1 := enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "game", "create": true, "groupSize": 2,
	})
	if entered1.Type != "pool.entered" {
		t.Fatalf("expected pool.entered, got %s", entered1.Type)
	}

	entered2 := enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "game", "create": true, "groupSize": 2,
	})
	if entered2.Type != "pool.entered" {
		t.Fatalf("expected pool.entered, got %s", entered2.Type)
	}

	matched1 := readFrame(t, conn1)
	matched2 := readFrame(t, conn2)

	if matched1.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-a, got %s", matched1.Type)
	}
	if matched2.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-b, got %s", matched2.Type)
	}

	var mp1 struct {
		Pool    string `json:"pool"`
		Session string `json:"session"`
		Peers   []struct {
			ID string `json:"id"`
		} `json:"peers"`
	}
	json.Unmarshal(matched1.Payload, &mp1)
	if mp1.Pool != "game" {
		t.Fatalf("expected pool 'game', got %s", mp1.Pool)
	}
	if mp1.Session == "" {
		t.Fatal("expected non-empty session name")
	}
	if len(mp1.Peers) != 2 {
		t.Fatalf("expected 2 peers, got %d", len(mp1.Peers))
	}
}

func TestPoolAutoModeWithFilter(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "en-player")

	conn2 := env.connect(t)
	hello(t, conn2, "fr-player")

	conn3 := env.connect(t)
	hello(t, conn3, "en-player2")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lang-match", "create": true, "groupSize": 2,
		"attributes": map[string]any{"language": "en"},
		"filter":     map[string]any{"language": "@self"},
	})

	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lang-match", "create": true, "groupSize": 2,
		"attributes": map[string]any{"language": "fr"},
		"filter":     map[string]any{"language": "@self"},
	})

	enterPool(t, conn3, "pe_3", map[string]any{
		"pool": "lang-match", "create": true, "groupSize": 2,
		"attributes": map[string]any{"language": "en"},
		"filter":     map[string]any{"language": "@self"},
	})

	matched1 := readFrame(t, conn1)
	if matched1.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for en-player, got %s", matched1.Type)
	}

	matched3 := readFrame(t, conn3)
	if matched3.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for en-player2, got %s", matched3.Type)
	}
}

func TestPoolClaimMode(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "player-a")

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "player-b")
	id2 := getClientID(t, w2)

	entered1 := enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "claim", "groupSize": 2,
	})
	if entered1.Type != "pool.entered" {
		t.Fatalf("expected pool.entered, got %s", entered1.Type)
	}

	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	if memberJoined.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined, got %s", memberJoined.Type)
	}

	claimPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "target": id2,
	})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "claim_1", Type: "pool.claim", Payload: claimPayload,
	})

	matched1 := readFrame(t, conn1)
	if matched1.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-a, got %s", matched1.Type)
	}

	matched2 := readFrame(t, conn2)
	if matched2.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-b, got %s", matched2.Type)
	}
}

func TestPoolMutualMode(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	w1 := hello(t, conn1, "player-a")
	id1 := getClientID(t, w1)

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "player-b")
	id2 := getClientID(t, w2)

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "mutual", "groupSize": 2,
	})
	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "mutual", "groupSize": 2,
	})

	readFrame(t, conn1) // member.joined for B

	claimPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "target": id2,
	})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "claim_1", Type: "pool.claim", Payload: claimPayload,
	})

	pending := readFrame(t, conn1)
	if pending.Type != "pool.claim.pending" {
		t.Fatalf("expected pool.claim.pending, got %s", pending.Type)
	}

	claimPayload2, _ := json.Marshal(map[string]any{
		"pool": "lobby", "target": id1,
	})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "claim_2", Type: "pool.claim", Payload: claimPayload2,
	})

	matched2 := readFrame(t, conn2)
	if matched2.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-b, got %s", matched2.Type)
	}

	matched1 := readFrame(t, conn1)
	if matched1.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-a, got %s", matched1.Type)
	}
}
