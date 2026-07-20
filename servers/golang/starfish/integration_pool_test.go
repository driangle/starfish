package starfish_test

import (
	"testing"

	"github.com/driangle/starfish/servers/golang/starfish"
	"nhooyr.io/websocket"
)

func enterPool(t *testing.T, conn *websocket.Conn, id string, opts map[string]any) *starfish.Frame {
	t.Helper()
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       id,
			Resource: "pool",
			Method:   "enter",
			Kind:     "request",
		},
		Payload: opts,
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
	if entered1.Header.Resource != "pool" || entered1.Header.Method != "enter" || entered1.Header.Kind != "response" {
		t.Fatalf("expected pool/enter/response, got %s/%s/%s", entered1.Header.Resource, entered1.Header.Method, entered1.Header.Kind)
	}

	entered2 := enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "game", "create": true, "groupSize": 2,
	})
	if entered2.Header.Resource != "pool" || entered2.Header.Method != "enter" {
		t.Fatalf("expected pool/enter, got %s/%s", entered2.Header.Resource, entered2.Header.Method)
	}

	matched1 := readFrame(t, conn1)
	matched2 := readFrame(t, conn2)

	if matched1.Header.Resource != "pool" || matched1.Header.Method != "matched" || matched1.Header.Kind != "event" {
		t.Fatalf("expected pool/matched/event for player-a, got %s/%s/%s", matched1.Header.Resource, matched1.Header.Method, matched1.Header.Kind)
	}
	if matched2.Header.Resource != "pool" || matched2.Header.Method != "matched" || matched2.Header.Kind != "event" {
		t.Fatalf("expected pool/matched/event for player-b, got %s/%s/%s", matched2.Header.Resource, matched2.Header.Method, matched2.Header.Kind)
	}

	pool, _ := matched1.Payload["pool"].(string)
	if pool != "game" {
		t.Fatalf("expected pool 'game', got %s", pool)
	}
	session, _ := matched1.Payload["session"].(string)
	if session == "" {
		t.Fatal("expected non-empty session name")
	}
	// peers lists the other members of the group, excluding the recipient.
	peers, _ := matched1.Payload["peers"].([]any)
	if len(peers) != 1 {
		t.Fatalf("expected 1 peer, got %d", len(peers))
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
	if matched1.Header.Resource != "pool" || matched1.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for en-player, got %s/%s", matched1.Header.Resource, matched1.Header.Method)
	}

	matched3 := readFrame(t, conn3)
	if matched3.Header.Resource != "pool" || matched3.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for en-player2, got %s/%s", matched3.Header.Resource, matched3.Header.Method)
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
	if entered1.Header.Resource != "pool" || entered1.Header.Method != "enter" {
		t.Fatalf("expected pool/enter, got %s/%s", entered1.Header.Resource, entered1.Header.Method)
	}

	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	if memberJoined.Header.Resource != "pool" || memberJoined.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined, got %s/%s", memberJoined.Header.Resource, memberJoined.Header.Method)
	}

	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "claim_1",
			Resource: "pool",
			Method:   "claim",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "lobby", "target": id2,
		},
	})

	matched1 := readFrame(t, conn1)
	if matched1.Header.Resource != "pool" || matched1.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-a, got %s/%s", matched1.Header.Resource, matched1.Header.Method)
	}

	matched2 := readFrame(t, conn2)
	if matched2.Header.Resource != "pool" || matched2.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-b, got %s/%s", matched2.Header.Resource, matched2.Header.Method)
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

	readFrame(t, conn1) // member-joined for B

	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "claim_1",
			Resource: "pool",
			Method:   "claim",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "lobby", "target": id2,
		},
	})

	pending := readFrame(t, conn1)
	if pending.Header.Resource != "pool" || pending.Header.Method != "claim" || pending.Header.Kind != "response" {
		t.Fatalf("expected pool/claim/response, got %s/%s/%s", pending.Header.Resource, pending.Header.Method, pending.Header.Kind)
	}
	status, _ := pending.Payload["status"].(string)
	if status != "pending" {
		t.Fatalf("expected status pending, got %s", status)
	}

	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "claim_2",
			Resource: "pool",
			Method:   "claim",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "lobby", "target": id1,
		},
	})

	matched2 := readFrame(t, conn2)
	if matched2.Header.Resource != "pool" || matched2.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-b, got %s/%s", matched2.Header.Resource, matched2.Header.Method)
	}

	matched1 := readFrame(t, conn1)
	if matched1.Header.Resource != "pool" || matched1.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-a, got %s/%s", matched1.Header.Resource, matched1.Header.Method)
	}

	_ = id1 // used in payload
}
