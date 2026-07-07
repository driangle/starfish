package starfish_test

import (
	"context"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/driangle/starfish/servers/golang/starfish"
	"nhooyr.io/websocket"
)

// testEnv wraps a test server and provides helpers.
type testEnv struct {
	hub    *starfish.Hub
	server *httptest.Server
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	config := starfish.DefaultConfig()
	config.HeartbeatInterval = 5 * time.Second
	config.HeartbeatTimeout = 10 * time.Second
	config.ResumeTimeout = 500 * time.Millisecond
	config.PresenceThrottleMs = 10 // Fast for tests

	hub := starfish.NewHub(config)
	server := httptest.NewServer(hub)
	t.Cleanup(func() { server.Close() })

	return &testEnv{hub: hub, server: server}
}

// connect creates a WebSocket connection to the test server.
func (e *testEnv) connect(t *testing.T) *websocket.Conn {
	t.Helper()
	url := "ws" + strings.TrimPrefix(e.server.URL, "http") + "/starfish"
	ctx := context.Background()
	conn, _, err := websocket.Dial(ctx, url, nil)
	if err != nil {
		t.Fatalf("failed to connect: %v", err)
	}
	t.Cleanup(func() { conn.Close(websocket.StatusNormalClosure, "") })
	return conn
}

// sendFrame writes a JSON frame to the connection.
func sendFrame(t *testing.T, conn *websocket.Conn, f *starfish.Frame) {
	t.Helper()
	data, err := json.Marshal(f)
	if err != nil {
		t.Fatalf("failed to marshal frame: %v", err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := conn.Write(ctx, websocket.MessageText, data); err != nil {
		t.Fatalf("failed to write frame: %v", err)
	}
}

// readFrame reads and parses a JSON frame from the connection.
func readFrame(t *testing.T, conn *websocket.Conn) *starfish.Frame {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_, data, err := conn.Read(ctx)
	if err != nil {
		t.Fatalf("failed to read frame: %v", err)
	}
	var f starfish.Frame
	if err := json.Unmarshal(data, &f); err != nil {
		t.Fatalf("failed to unmarshal frame: %v", err)
	}
	return &f
}

// hello performs a client.hello handshake and returns the welcome frame.
func hello(t *testing.T, conn *websocket.Conn, name string) *starfish.Frame {
	t.Helper()
	payload, _ := json.Marshal(map[string]any{
		"client": map[string]any{
			"name": name,
			"role": "test",
		},
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "hello_1",
		Type:    "client.hello",
		Payload: payload,
	})
	return readFrame(t, conn)
}

// getClientID extracts clientId from a welcome frame's payload.
func getClientID(t *testing.T, welcome *starfish.Frame) string {
	t.Helper()
	var p struct {
		ClientID string `json:"clientId"`
	}
	if err := json.Unmarshal(welcome.Payload, &p); err != nil {
		t.Fatalf("failed to parse welcome payload: %v", err)
	}
	return p.ClientID
}

// getResumeToken extracts resumeToken from a welcome frame's payload.
func getResumeToken(t *testing.T, welcome *starfish.Frame) string {
	t.Helper()
	var p struct {
		ResumeToken string `json:"resumeToken"`
	}
	if err := json.Unmarshal(welcome.Payload, &p); err != nil {
		t.Fatalf("failed to parse welcome payload: %v", err)
	}
	return p.ResumeToken
}

// joinSession joins a session and returns the session.joined frame.
func joinSession(t *testing.T, conn *websocket.Conn, sessionName string) *starfish.Frame {
	t.Helper()
	payload, _ := json.Marshal(map[string]any{
		"create": true,
		"name":   "test-client",
		"role":   "test",
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "join_1",
		Type:    "session.join",
		Session: sessionName,
		Payload: payload,
	})
	return readFrame(t, conn)
}

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

func TestDataSaveGet(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "data-client")
	joinSession(t, conn, "s1")

	// Save data
	savePayload, _ := json.Marshal(map[string]any{
		"key":   "score",
		"scope": "session",
		"op":    "replace",
		"data":  42,
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "save_1",
		Type:    "data.save",
		Session: "s1",
		Payload: savePayload,
	})

	saved := readFrame(t, conn)
	if saved.Type != "data.saved" {
		t.Fatalf("expected data.saved, got %s", saved.Type)
	}

	// Also read data.changed (broadcast to all including sender)
	changed := readFrame(t, conn)
	if changed.Type != "data.changed" {
		t.Fatalf("expected data.changed, got %s", changed.Type)
	}

	// Get data
	getPayload, _ := json.Marshal(map[string]any{
		"key":   "score",
		"scope": "session",
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "get_1",
		Type:    "data.get",
		Session: "s1",
		Payload: getPayload,
	})

	value := readFrame(t, conn)
	if value.Type != "data.value" {
		t.Fatalf("expected data.value, got %s", value.Type)
	}

	var vp struct {
		Key     string `json:"key"`
		Version int64  `json:"version"`
		Data    int    `json:"data"`
	}
	json.Unmarshal(value.Payload, &vp)
	if vp.Data != 42 {
		t.Fatalf("expected data 42, got %d", vp.Data)
	}
	if vp.Version != 1 {
		t.Fatalf("expected version 1, got %d", vp.Version)
	}
}

func TestDataConflict(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "data-client")
	joinSession(t, conn, "s1")

	// Save with replace
	savePayload, _ := json.Marshal(map[string]any{
		"key":   "score",
		"scope": "session",
		"op":    "replace",
		"data":  10,
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "s1",
		Type:    "data.save",
		Session: "s1",
		Payload: savePayload,
	})
	readFrame(t, conn) // data.saved
	readFrame(t, conn) // data.changed

	// Try to save with wrong expectedVersion
	conflictPayload, _ := json.Marshal(map[string]any{
		"key":             "score",
		"scope":           "session",
		"op":              "replace",
		"data":            20,
		"expectedVersion": 0, // Wrong - actual is 1
	})
	sendFrame(t, conn, &starfish.Frame{
		V:       1,
		ID:      "s2",
		Type:    "data.save",
		Session: "s1",
		Payload: conflictPayload,
	})

	errFrame := readFrame(t, conn)
	if errFrame.Type != "error" {
		t.Fatalf("expected error, got %s", errFrame.Type)
	}
	if errFrame.Error.Code != "data.conflict" {
		t.Fatalf("expected data.conflict, got %s", errFrame.Error.Code)
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

func TestResumeConnection(t *testing.T) {
	env := newTestEnv(t)

	// Connect and join a session
	conn1 := env.connect(t)
	welcome := hello(t, conn1, "resumable")
	clientID := getClientID(t, welcome)
	resumeToken := getResumeToken(t, welcome)
	joinSession(t, conn1, "s1")

	// Disconnect
	conn1.Close(websocket.StatusNormalClosure, "")
	time.Sleep(50 * time.Millisecond)

	// Reconnect with resume token
	conn2 := env.connect(t)
	payload, _ := json.Marshal(map[string]any{
		"resumeToken": resumeToken,
	})
	sendFrame(t, conn2, &starfish.Frame{
		V:       1,
		ID:      "hello_2",
		Type:    "client.hello",
		Payload: payload,
	})

	welcome2 := readFrame(t, conn2)
	if welcome2.Type != "server.welcome" {
		t.Fatalf("expected server.welcome, got %s", welcome2.Type)
	}

	var wp struct {
		ClientID string   `json:"clientId"`
		Resumed  bool     `json:"resumed"`
		Sessions []string `json:"sessions"`
	}
	json.Unmarshal(welcome2.Payload, &wp)

	if wp.ClientID != clientID {
		t.Fatalf("expected same clientId %s, got %s", clientID, wp.ClientID)
	}
	if !wp.Resumed {
		t.Fatal("expected resumed: true")
	}
	if len(wp.Sessions) != 1 || wp.Sessions[0] != "s1" {
		t.Fatalf("expected sessions [s1], got %v", wp.Sessions)
	}
}

func TestResumeExpired(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	welcome := hello(t, conn1, "ephemeral")
	resumeToken := getResumeToken(t, welcome)

	joinSession(t, conn1, "s1")

	// Another client to observe disconnection
	conn2 := env.connect(t)
	hello(t, conn2, "observer")
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected for observer

	// Disconnect client 1
	conn1.Close(websocket.StatusNormalClosure, "")

	// Wait for resume timeout (500ms in test config)
	time.Sleep(700 * time.Millisecond)

	// Observer should have received client.disconnected with reason "timeout"
	disconnected := readFrame(t, conn2)
	if disconnected.Type != "client.disconnected" {
		t.Fatalf("expected client.disconnected, got %s", disconnected.Type)
	}
	var dp struct {
		Reason string `json:"reason"`
	}
	json.Unmarshal(disconnected.Payload, &dp)
	if dp.Reason != "timeout" {
		t.Fatalf("expected reason timeout, got %s", dp.Reason)
	}

	// Try to resume with expired token -- should get fresh connection
	conn3 := env.connect(t)
	payload, _ := json.Marshal(map[string]any{
		"resumeToken": resumeToken,
	})
	sendFrame(t, conn3, &starfish.Frame{
		V:       1,
		ID:      "hello_3",
		Type:    "client.hello",
		Payload: payload,
	})

	welcome3 := readFrame(t, conn3)
	var wp struct {
		Resumed bool `json:"resumed"`
	}
	json.Unmarshal(welcome3.Payload, &wp)
	if wp.Resumed {
		t.Fatal("expected resumed: false after expiry")
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

func TestRTCSignalingRelay(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	w1 := hello(t, conn1, "peer-a")
	id1 := getClientID(t, w1)
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "peer-b")
	id2 := getClientID(t, w2)
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // client.connected
	_ = id1

	// Send rtc.offer from conn1 to conn2
	to, _ := json.Marshal(id2)
	offerPayload, _ := json.Marshal(map[string]string{"sdp": "test-sdp"})
	sendFrame(t, conn1, &starfish.Frame{
		V:       1,
		ID:      "rtc_1",
		Type:    "rtc.offer",
		Session: "s1",
		To:      to,
		Payload: offerPayload,
	})

	// conn2 should receive the offer
	offer := readFrame(t, conn2)
	if offer.Type != "rtc.offer" {
		t.Fatalf("expected rtc.offer, got %s", offer.Type)
	}
	if offer.From != id1 {
		t.Fatalf("expected from %s, got %s", id1, offer.From)
	}
}
