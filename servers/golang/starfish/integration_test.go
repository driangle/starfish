package starfish_test

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/driangle/starfish/servers/golang/starfish"
)

func TestHandshake(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	welcome := hello(t, conn, "test-client")

	if welcome.Type != "server.welcome" {
		t.Fatalf("expected server.welcome, got %s", welcome.Type)
	}
	if welcome.ReplyTo != "hello_1" {
		t.Fatalf("expected replyTo hello_1, got %s", welcome.ReplyTo)
	}

	clientID := getClientID(t, welcome)
	if !strings.HasPrefix(clientID, "client_") {
		t.Fatalf("expected clientId starting with client_, got %s", clientID)
	}

	var p struct {
		ResumeToken       string `json:"resumeToken"`
		HeartbeatInterval int64  `json:"heartbeatInterval"`
		ServerTime        int64  `json:"serverTime"`
	}
	json.Unmarshal(welcome.Payload, &p)

	if !strings.HasPrefix(p.ResumeToken, "rt_") {
		t.Fatalf("expected resumeToken starting with rt_, got %s", p.ResumeToken)
	}
	if p.HeartbeatInterval != 5000 {
		t.Fatalf("expected heartbeatInterval 5000, got %d", p.HeartbeatInterval)
	}
	if p.ServerTime == 0 {
		t.Fatal("expected non-zero serverTime")
	}
}

func TestSessionJoinLeave(t *testing.T) {
	env := newTestEnv(t)

	// Client 1 connects and joins
	conn1 := env.connect(t)
	hello(t, conn1, "client-1")
	joined := joinSession(t, conn1, "test-session")

	if joined.Type != "session.joined" {
		t.Fatalf("expected session.joined, got %s", joined.Type)
	}

	// Client 2 connects and joins same session
	conn2 := env.connect(t)
	hello(t, conn2, "client-2")
	joined2 := joinSession(t, conn2, "test-session")

	if joined2.Type != "session.joined" {
		t.Fatalf("expected session.joined, got %s", joined2.Type)
	}

	// Client 1 should receive client.connected
	connected := readFrame(t, conn1)
	if connected.Type != "client.connected" {
		t.Fatalf("expected client.connected, got %s", connected.Type)
	}

	// Client 2 leaves
	sendFrame(t, conn2, &starfish.Frame{
		V:       1,
		ID:      "leave_1",
		Type:    "session.leave",
		Session: "test-session",
	})

	// Client 2 receives session.left
	left := readFrame(t, conn2)
	if left.Type != "session.left" {
		t.Fatalf("expected session.left, got %s", left.Type)
	}

	// Client 1 should receive client.disconnected
	disconnected := readFrame(t, conn1)
	if disconnected.Type != "client.disconnected" {
		t.Fatalf("expected client.disconnected, got %s", disconnected.Type)
	}
}

func TestTopicPubSub(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "pub")
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	hello(t, conn2, "sub")
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected for conn2

	// Subscribe conn2 to "lights"
	sendFrame(t, conn2, &starfish.Frame{
		V:       1,
		ID:      "sub_1",
		Type:    "topic.subscribe",
		Session: "s1",
		Topic:   "lights",
	})
	subscribed := readFrame(t, conn2)
	if subscribed.Type != "topic.subscribed" {
		t.Fatalf("expected topic.subscribed, got %s", subscribed.Type)
	}

	// Read topic.peers
	peers := readFrame(t, conn2)
	if peers.Type != "topic.peers" {
		t.Fatalf("expected topic.peers, got %s", peers.Type)
	}

	// Publish from conn1
	pubPayload, _ := json.Marshal(map[string]string{"cue": "blackout"})
	sendFrame(t, conn1, &starfish.Frame{
		V:       1,
		ID:      "pub_1",
		Type:    "topic.publish",
		Session: "s1",
		Topic:   "lights",
		Payload: pubPayload,
	})

	// conn2 should receive topic.message
	msg := readFrame(t, conn2)
	if msg.Type != "topic.message" {
		t.Fatalf("expected topic.message, got %s", msg.Type)
	}
	if msg.Topic != "lights" {
		t.Fatalf("expected topic lights, got %s", msg.Topic)
	}
}

func TestDirectMessage(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	w1 := hello(t, conn1, "sender")
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "receiver")
	client2ID := getClientID(t, w2)
	_ = getClientID(t, w1)
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected

	// Send direct message
	to, _ := json.Marshal(client2ID)
	dmPayload, _ := json.Marshal(map[string]string{"gesture": "freeze"})
	sendFrame(t, conn1, &starfish.Frame{
		V:       1,
		ID:      "dm_1",
		Type:    "client.send",
		Session: "s1",
		To:      to,
		Payload: dmPayload,
	})

	// conn2 should receive client.message
	msg := readFrame(t, conn2)
	if msg.Type != "client.message" {
		t.Fatalf("expected client.message, got %s", msg.Type)
	}
}

func TestBroadcast(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "broadcaster")
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	hello(t, conn2, "listener")
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected

	// Broadcast
	bcPayload, _ := json.Marshal(map[string]string{"cue": "start"})
	sendFrame(t, conn1, &starfish.Frame{
		V:       1,
		ID:      "bc_1",
		Type:    "session.broadcast",
		Session: "s1",
		Payload: bcPayload,
	})

	msg := readFrame(t, conn2)
	if msg.Type != "session.broadcast" {
		t.Fatalf("expected session.broadcast, got %s", msg.Type)
	}
}

func TestPresence(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "c1")
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	hello(t, conn2, "c2")
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected

	// Set presence from conn1
	presPayload, _ := json.Marshal(map[string]any{"x": 0.5, "y": 0.8})
	sendFrame(t, conn1, &starfish.Frame{
		V:       1,
		ID:      "pres_1",
		Type:    "presence.set",
		Session: "s1",
		Payload: presPayload,
	})

	// Both clients should receive presence.updated (after throttle)
	msg := readFrame(t, conn1)
	if msg.Type != "presence.updated" {
		t.Fatalf("expected presence.updated, got %s", msg.Type)
	}

	msg2 := readFrame(t, conn2)
	if msg2.Type != "presence.updated" {
		t.Fatalf("expected presence.updated, got %s", msg2.Type)
	}
}

func TestPingPong(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	ts := time.Now().UnixMilli()
	sendFrame(t, conn, &starfish.Frame{
		V:    1,
		ID:   "ping_1",
		Type: "ping",
		Ts:   &ts,
	})

	pong := readFrame(t, conn)
	if pong.Type != "pong" {
		t.Fatalf("expected pong, got %s", pong.Type)
	}
	if pong.ReplyTo != "ping_1" {
		t.Fatalf("expected replyTo ping_1, got %s", pong.ReplyTo)
	}
}

func TestClockSync(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	ts := time.Now().UnixMilli()
	sendFrame(t, conn, &starfish.Frame{
		V:    1,
		ID:   "clock_1",
		Type: "clock.sync",
		Ts:   &ts,
	})

	synced := readFrame(t, conn)
	if synced.Type != "clock.synced" {
		t.Fatalf("expected clock.synced, got %s", synced.Type)
	}

	var p struct {
		ServerTime int64 `json:"serverTime"`
	}
	json.Unmarshal(synced.Payload, &p)
	if p.ServerTime == 0 {
		t.Fatal("expected non-zero serverTime")
	}
}

func TestSessionNotFoundWithoutCreate(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "client")

	// Try to join non-existent session without create: true
	payload, _ := json.Marshal(map[string]any{
		"create": false,
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "join_1",
		Type:    "session.join",
		Session: "nonexistent",
		Payload: payload,
	})

	errFrame := readFrame(t, conn)
	if errFrame.Type != "error" {
		t.Fatalf("expected error, got %s", errFrame.Type)
	}
	if errFrame.Error.Code != "session.not_found" {
		t.Fatalf("expected session.not_found, got %s", errFrame.Error.Code)
	}
}

func TestUnsupportedVersion(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	sendFrame(t, conn, &starfish.Frame{
		V:    2,
		ID:   "bad_1",
		Type: "client.hello",
	})

	errFrame := readFrame(t, conn)
	if errFrame.Type != "error" {
		t.Fatalf("expected error, got %s", errFrame.Type)
	}
	if errFrame.Error.Code != "protocol.unsupported_version" {
		t.Fatalf("expected protocol.unsupported_version, got %s", errFrame.Error.Code)
	}
}
