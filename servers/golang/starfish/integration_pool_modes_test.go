package starfish_test

import (
	"encoding/json"
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
	if memberJoined.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined, got %s", memberJoined.Type)
	}

	var joinedPayload struct {
		Member struct {
			ID string `json:"id"`
		} `json:"member"`
	}
	json.Unmarshal(memberJoined.Payload, &joinedPayload)
	id2 := joinedPayload.Member.ID

	claimPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "target": id2,
	})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "claim_1", Type: "pool.claim", Payload: claimPayload,
	})

	proposal := readFrame(t, conn2)
	if proposal.Type != "pool.proposal" {
		t.Fatalf("expected pool.proposal, got %s", proposal.Type)
	}
	var pp struct {
		From string `json:"from"`
	}
	json.Unmarshal(proposal.Payload, &pp)
	if pp.From != id1 {
		t.Fatalf("expected proposal from %s, got %s", id1, pp.From)
	}

	acceptPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "from": id1,
	})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "accept_1", Type: "pool.accept", Payload: acceptPayload,
	})

	matched2 := readFrame(t, conn2)
	if matched2.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for target, got %s", matched2.Type)
	}

	matched1 := readFrame(t, conn1)
	if matched1.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for proposer, got %s", matched1.Type)
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
	var joinedPayload struct {
		Member struct {
			ID string `json:"id"`
		} `json:"member"`
	}
	json.Unmarshal(memberJoined.Payload, &joinedPayload)
	id2 := joinedPayload.Member.ID

	claimPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "target": id2,
	})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "claim_1", Type: "pool.claim", Payload: claimPayload,
	})

	proposal := readFrame(t, conn2)
	if proposal.Type != "pool.proposal" {
		t.Fatalf("expected pool.proposal, got %s", proposal.Type)
	}

	rejectPayload, _ := json.Marshal(map[string]any{
		"pool": "lobby", "from": id1,
	})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "reject_1", Type: "pool.reject", Payload: rejectPayload,
	})

	rejected := readFrame(t, conn1)
	if rejected.Type != "pool.claim.rejected" {
		t.Fatalf("expected pool.claim.rejected, got %s", rejected.Type)
	}
	var rp struct {
		Target string `json:"target"`
	}
	json.Unmarshal(rejected.Payload, &rp)
	if rp.Target != id2 {
		t.Fatalf("expected target %s, got %s", id2, rp.Target)
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
	if mj1.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined, got %s", mj1.Type)
	}

	enterPool(t, conn3, "pe_3", map[string]any{
		"pool": "lobby", "create": true, "mode": "delegated", "groupSize": 2,
	})

	mj2 := readFrame(t, conn1)
	if mj2.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined, got %s", mj2.Type)
	}

	assignPayload, _ := json.Marshal(map[string]any{
		"pool":   "lobby",
		"groups": [][]string{{id2, id3}},
	})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "assign_1", Type: "pool.assign", Payload: assignPayload,
	})

	matched2 := readFrame(t, conn2)
	if matched2.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-a, got %s", matched2.Type)
	}

	matched3 := readFrame(t, conn3)
	if matched3.Type != "pool.matched" {
		t.Fatalf("expected pool.matched for player-b, got %s", matched3.Type)
	}

	var assigned *starfish.Frame
	for i := 0; i < 3; i++ {
		f := readFrame(t, conn1)
		if f.Type == "pool.assigned" {
			assigned = f
		}
	}
	if assigned == nil {
		t.Fatal("expected pool.assigned for matchmaker")
	}
}

func TestPoolLeaveDestroy(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "player")

	enterPool(t, conn1, "pe_1", map[string]any{
		"pool": "temp", "create": true, "groupSize": 2,
	})

	leavePayload, _ := json.Marshal(map[string]any{"pool": "temp"})
	sendFrame(t, conn1, &starfish.Frame{
		V: 1, ID: "leave_1", Type: "pool.leave", Payload: leavePayload,
	})

	entered := enterPool(t, conn1, "pe_2", map[string]any{
		"pool": "temp", "groupSize": 2,
	})
	if entered.Type != "error" {
		t.Fatalf("expected error (pool.not_found), got %s", entered.Type)
	}
	if entered.Error.Code != "pool.not_found" {
		t.Fatalf("expected pool.not_found, got %s", entered.Error.Code)
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
	payload, _ := json.Marshal(map[string]any{
		"resumeToken": resumeToken,
	})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "hello_2", Type: "client.hello", Payload: payload,
	})

	welcome2 := readFrame(t, conn2)
	if welcome2.Type != "server.welcome" {
		t.Fatalf("expected server.welcome, got %s", welcome2.Type)
	}

	conn3 := env.connect(t)
	hello(t, conn3, "player-b")

	enterPool(t, conn3, "pe_3", map[string]any{
		"pool": "persist", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn2)
	if memberJoined.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined, got %s", memberJoined.Type)
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

	readFrame(t, conn1) // pool.member.joined

	conn2.Close(websocket.StatusNormalClosure, "")
	time.Sleep(700 * time.Millisecond)

	memberLeft := readFrame(t, conn1)
	if memberLeft.Type != "pool.member.left" {
		t.Fatalf("expected pool.member.left, got %s", memberLeft.Type)
	}
	var lp struct {
		Reason string `json:"reason"`
	}
	json.Unmarshal(memberLeft.Payload, &lp)
	if lp.Reason != "timeout" {
		t.Fatalf("expected reason 'timeout', got %s", lp.Reason)
	}
}

func TestPoolErrors(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "tester")

	entered := enterPool(t, conn, "pe_1", map[string]any{
		"pool": "nonexistent", "groupSize": 2,
	})
	if entered.Type != "error" || entered.Error.Code != "pool.not_found" {
		t.Fatalf("expected pool.not_found error, got %s %v", entered.Type, entered.Error)
	}

	enterPool(t, conn, "pe_2", map[string]any{
		"pool": "auto-pool", "create": true, "groupSize": 2,
	})

	claimPayload, _ := json.Marshal(map[string]any{
		"pool": "auto-pool", "target": "fake",
	})
	sendFrame(t, conn, &starfish.Frame{
		V: 1, ID: "claim_err", Type: "pool.claim", Payload: claimPayload,
	})
	errFrame := readFrame(t, conn)
	if errFrame.Type != "error" || errFrame.Error.Code != "pool.mode_mismatch" {
		t.Fatalf("expected pool.mode_mismatch, got %s %v", errFrame.Type, errFrame.Error)
	}

	conn2 := env.connect(t)
	hello(t, conn2, "non-matchmaker")
	enterPool(t, conn2, "pe_3", map[string]any{
		"pool": "delegated-pool", "create": true, "mode": "delegated", "groupSize": 2,
	})

	assignPayload, _ := json.Marshal(map[string]any{
		"pool":   "delegated-pool",
		"groups": [][]string{{"a", "b"}},
	})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "assign_err", Type: "pool.assign", Payload: assignPayload,
	})
	errFrame = readFrame(t, conn2)
	if errFrame.Type != "error" || errFrame.Error.Code != "pool.role_required" {
		t.Fatalf("expected pool.role_required, got %s %v", errFrame.Type, errFrame.Error)
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

	leavePayload, _ := json.Marshal(map[string]any{"pool": "auto-test"})
	sendFrame(t, conn2, &starfish.Frame{
		V: 1, ID: "leave_1", Type: "pool.leave", Payload: leavePayload,
	})

	enterPool(t, conn1, "pe_3", map[string]any{
		"pool": "claim-test", "create": true, "mode": "claim", "groupSize": 2,
	})

	conn3 := env.connect(t)
	hello(t, conn3, "claim-b")
	enterPool(t, conn3, "pe_4", map[string]any{
		"pool": "claim-test", "create": true, "mode": "claim", "groupSize": 2,
	})

	memberJoined := readFrame(t, conn1)
	if memberJoined.Type != "pool.member.joined" {
		t.Fatalf("expected pool.member.joined in claim mode, got %s", memberJoined.Type)
	}
}
