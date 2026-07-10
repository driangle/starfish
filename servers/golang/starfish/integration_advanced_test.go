package starfish_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/driangle/starfish/servers/golang/starfish"
	"nhooyr.io/websocket"
)

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
