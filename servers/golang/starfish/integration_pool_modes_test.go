package starfish_test

import (
	"testing"
	"time"

	"github.com/driangle/starfish/servers/golang/starfish"
	"nhooyr.io/websocket"
)

func TestPoolProposeAccept(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	w1 := hello(t, conn1, "proposer")
	id1 := getClientID(t, w1)

	conn2 := env.connect(t)
	hello(t, conn2, "target")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "propose", "groupSize": 2,
		"attributes": map[string]any{"mood": "calm"},
	})
	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "propose", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	if memberJoined.Header.Resource != "pool" || memberJoined.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined, got %s/%s", memberJoined.Header.Resource, memberJoined.Header.Method)
	}

	member, _ := memberJoined.Payload["member"].(map[string]any)
	id2, _ := member["id"].(string)

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

	proposal := readFrame(t, conn2)
	if proposal.Header.Resource != "pool" || proposal.Header.Method != "proposal" || proposal.Header.Kind != "event" {
		t.Fatalf("expected pool/proposal/event, got %s/%s/%s", proposal.Header.Resource, proposal.Header.Method, proposal.Header.Kind)
	}
	from, _ := proposal.Payload["from"].(string)
	if from != id1 {
		t.Fatalf("expected proposal from %s, got %s", id1, from)
	}

	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "accept_1",
			Resource: "pool",
			Method:   "accept",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "lobby", "from": id1,
		},
	})

	matched2 := readFrame(t, conn2)
	if matched2.Header.Resource != "pool" || matched2.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for target, got %s/%s", matched2.Header.Resource, matched2.Header.Method)
	}

	matched1 := readFrame(t, conn1)
	if matched1.Header.Resource != "pool" || matched1.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for proposer, got %s/%s", matched1.Header.Resource, matched1.Header.Method)
	}
}

func TestPoolProposeReject(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	w1 := hello(t, conn1, "proposer")
	id1 := getClientID(t, w1)

	conn2 := env.connect(t)
	hello(t, conn2, "target")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "propose", "groupSize": 2,
	})
	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "propose", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	member, _ := memberJoined.Payload["member"].(map[string]any)
	id2, _ := member["id"].(string)

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

	proposal := readFrame(t, conn2)
	if proposal.Header.Resource != "pool" || proposal.Header.Method != "proposal" {
		t.Fatalf("expected pool/proposal, got %s/%s", proposal.Header.Resource, proposal.Header.Method)
	}

	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "reject_1",
			Resource: "pool",
			Method:   "reject",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "lobby", "from": id1,
		},
	})

	rejected := readFrame(t, conn1)
	if rejected.Header.Resource != "pool" || rejected.Header.Method != "claim-rejected" || rejected.Header.Kind != "event" {
		t.Fatalf("expected pool/claim-rejected/event, got %s/%s/%s", rejected.Header.Resource, rejected.Header.Method, rejected.Header.Kind)
	}
	target, _ := rejected.Payload["target"].(string)
	if target != id2 {
		t.Fatalf("expected target %s, got %s", id2, target)
	}
}

func TestPoolDelegatedMode(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "matchmaker")

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "player-a")
	id2 := getClientID(t, w2)

	conn3 := env.connect(t)
	w3 := hello(t, conn3, "player-b")
	id3 := getClientID(t, w3)

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "delegated", "groupSize": 2,
		"role": "matchmaker",
	})

	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "delegated", "groupSize": 2,
	})

	mj1 := readFrame(t, conn1)
	if mj1.Header.Resource != "pool" || mj1.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined, got %s/%s", mj1.Header.Resource, mj1.Header.Method)
	}

	enterPool(t, conn3, "pe_3", map[string]any{
		"pool": "lobby", "create": true, "mode": "delegated", "groupSize": 2,
	})

	mj2 := readFrame(t, conn1)
	if mj2.Header.Resource != "pool" || mj2.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined, got %s/%s", mj2.Header.Resource, mj2.Header.Method)
	}

	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "assign_1",
			Resource: "pool",
			Method:   "assign",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool":   "lobby",
			"groups": []any{[]any{id2, id3}},
		},
	})

	matched2 := readFrame(t, conn2)
	if matched2.Header.Resource != "pool" || matched2.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-a, got %s/%s", matched2.Header.Resource, matched2.Header.Method)
	}

	matched3 := readFrame(t, conn3)
	if matched3.Header.Resource != "pool" || matched3.Header.Method != "matched" {
		t.Fatalf("expected pool/matched for player-b, got %s/%s", matched3.Header.Resource, matched3.Header.Method)
	}

	// Matchmaker receives member-left events and the assign response
	var assigned *starfish.Frame
	for i := 0; i < 3; i++ {
		f := readFrame(t, conn1)
		if f.Header.Resource == "pool" && f.Header.Method == "assign" && f.Header.Kind == "response" {
			assigned = f
		}
	}
	if assigned == nil {
		t.Fatal("expected pool/assign/response for matchmaker")
	}
}

func TestPoolLeaveDestroy(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "player")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "temp", "create": true, "groupSize": 2,
	})

	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "leave_1",
			Resource: "pool",
			Method:   "leave",
			Kind:     "request",
		},
		Payload: map[string]any{"pool": "temp"},
	})

	// Try to enter the destroyed pool without create
	entered := enterPool(t, conn1, "pe_2", map[string]any{
		"pool": "temp", "groupSize": 2,
	})
	if entered.Header.Kind != "response" {
		t.Fatalf("expected response, got %s", entered.Header.Kind)
	}
	status, _ := entered.Payload["status"].(string)
	if status != "error" {
		t.Fatalf("expected error status, got %s", status)
	}
	errObj, _ := entered.Payload["error"].(map[string]any)
	code, _ := errObj["code"].(string)
	if code != "pool.not_found" {
		t.Fatalf("expected pool.not_found, got %s", code)
	}
}

func TestPoolResumePreservesMembership(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	welcome := hello(t, conn1, "resumable")
	resumeToken := getResumeToken(t, welcome)

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "persist", "create": true, "mode": "claim", "groupSize": 2,
	})

	conn1.Close(websocket.StatusNormalClosure, "")
	time.Sleep(50 * time.Millisecond)

	conn2 := env.connect(t)
	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "hello_2",
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			V:        1,
		},
		Payload: map[string]any{
			"versions":    []int{1},
			"resumeToken": resumeToken,
		},
	})

	welcome2 := readFrame(t, conn2)
	if welcome2.Header.Resource != "client" || welcome2.Header.Method != "welcome" {
		t.Fatalf("expected client/welcome, got %s/%s", welcome2.Header.Resource, welcome2.Header.Method)
	}

	conn3 := env.connect(t)
	hello(t, conn3, "player-b")

	enterPool(t, conn3, "pe_3", map[string]any{
		"pool": "persist", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn2)
	if memberJoined.Header.Resource != "pool" || memberJoined.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined, got %s/%s", memberJoined.Header.Resource, memberJoined.Header.Method)
	}
}

func TestPoolResumeExpiry(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "player-a")

	conn2 := env.connect(t)
	hello(t, conn2, "player-b")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "lobby", "create": true, "mode": "claim", "groupSize": 2,
	})
	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "lobby", "create": true, "mode": "claim", "groupSize": 2,
	})

	readFrame(t, conn1) // pool/member-joined

	conn2.Close(websocket.StatusNormalClosure, "")
	time.Sleep(700 * time.Millisecond)

	memberLeft := readFrame(t, conn1)
	if memberLeft.Header.Resource != "pool" || memberLeft.Header.Method != "member-left" {
		t.Fatalf("expected pool/member-left, got %s/%s", memberLeft.Header.Resource, memberLeft.Header.Method)
	}
	reason, _ := memberLeft.Payload["reason"].(string)
	if reason != "timeout" {
		t.Fatalf("expected reason 'timeout', got %s", reason)
	}
}

func TestPoolErrors(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "tester")

	// Pool not found
	entered := enterPool(t, conn, "pe_1", map[string]any{
		"pool": "nonexistent", "groupSize": 2,
	})
	status, _ := entered.Payload["status"].(string)
	errObj, _ := entered.Payload["error"].(map[string]any)
	code, _ := errObj["code"].(string)
	if status != "error" || code != "pool.not_found" {
		t.Fatalf("expected pool.not_found error, got status=%s code=%s", status, code)
	}

	// Enter auto pool then try to claim
	enterPool(t, conn, "pe_2", map[string]any{
		"pool": "auto-pool", "create": true, "groupSize": 2,
	})

	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "claim_err",
			Resource: "pool",
			Method:   "claim",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool": "auto-pool", "target": "fake",
		},
	})
	errFrame := readFrame(t, conn)
	errObj2, _ := errFrame.Payload["error"].(map[string]any)
	code2, _ := errObj2["code"].(string)
	if code2 != "pool.mode_mismatch" {
		t.Fatalf("expected pool.mode_mismatch, got %s", code2)
	}

	// Delegated pool: non-matchmaker tries to assign
	conn2 := env.connect(t)
	hello(t, conn2, "non-matchmaker")
	enterPool(t, conn2, "pe_3", map[string]any{
		"pool": "delegated-pool", "create": true, "mode": "delegated", "groupSize": 2,
	})

	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "assign_err",
			Resource: "pool",
			Method:   "assign",
			Kind:     "request",
		},
		Payload: map[string]any{
			"pool":   "delegated-pool",
			"groups": []any{[]any{"a", "b"}},
		},
	})
	errFrame = readFrame(t, conn2)
	errObj3, _ := errFrame.Payload["error"].(map[string]any)
	code3, _ := errObj3["code"].(string)
	if code3 != "pool.role_required" {
		t.Fatalf("expected pool.role_required, got %s", code3)
	}
}

func TestPoolMemberEventsVisibility(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "auto-a")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "auto-test", "create": true, "groupSize": 3,
	})

	conn2 := env.connect(t)
	hello(t, conn2, "auto-b")

	enterPool(t, conn2, "pe_2", map[string]any{
		"pool": "auto-test", "create": true, "groupSize": 3,
	})

	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "leave_1",
			Resource: "pool",
			Method:   "leave",
			Kind:     "request",
		},
		Payload: map[string]any{"pool": "auto-test"},
	})

	// In auto mode, no member events should be sent. Test claim mode visibility.
	enterPool(t, conn1, "pe_3", map[string]any{
		"pool": "claim-test", "create": true, "mode": "claim", "groupSize": 2,
	})

	conn3 := env.connect(t)
	hello(t, conn3, "claim-b")
	enterPool(t, conn3, "pe_4", map[string]any{
		"pool": "claim-test", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	if memberJoined.Header.Resource != "pool" || memberJoined.Header.Method != "member-joined" {
		t.Fatalf("expected pool/member-joined in claim mode, got %s/%s", memberJoined.Header.Resource, memberJoined.Header.Method)
	}
}
