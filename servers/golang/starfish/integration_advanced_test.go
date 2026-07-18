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
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "save_1",
			Resource: "data",
			Method:   "save",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{
			"key":   "score",
			"scope": "session",
			"op":    "replace",
			"data":  42,
		},
	})

	saved := readFrame(t, conn)
	if saved.Header.Resource != "data" || saved.Header.Method != "save" || saved.Header.Kind != "response" {
		t.Fatalf("expected data/save/response, got %s/%s/%s", saved.Header.Resource, saved.Header.Method, saved.Header.Kind)
	}

	// Also read data/changed event (broadcast to all including sender)
	changed := readFrame(t, conn)
	if changed.Header.Resource != "data" || changed.Header.Method != "changed" || changed.Header.Kind != "event" {
		t.Fatalf("expected data/changed/event, got %s/%s/%s", changed.Header.Resource, changed.Header.Method, changed.Header.Kind)
	}

	// Get data
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "get_1",
			Resource: "data",
			Method:   "get",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{
			"key":   "score",
			"scope": "session",
		},
	})

	value := readFrame(t, conn)
	if value.Header.Resource != "data" || value.Header.Method != "get" || value.Header.Kind != "response" {
		t.Fatalf("expected data/get/response, got %s/%s/%s", value.Header.Resource, value.Header.Method, value.Header.Kind)
	}

	data, _ := value.Payload["data"].(float64)
	if data != 42 {
		t.Fatalf("expected data 42, got %v", data)
	}
	version, _ := value.Payload["version"].(float64)
	if version != 1 {
		t.Fatalf("expected version 1, got %v", version)
	}
}

func TestDataConflict(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "data-client")
	joinSession(t, conn, "s1")

	// Save with replace
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "s1",
			Resource: "data",
			Method:   "save",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{
			"key":   "score",
			"scope": "session",
			"op":    "replace",
			"data":  10,
		},
	})
	readFrame(t, conn) // data/save response
	readFrame(t, conn) // data/changed event

	// Try to save with wrong expectedVersion
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "s2",
			Resource: "data",
			Method:   "save",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{
			"key":             "score",
			"scope":           "session",
			"op":              "replace",
			"data":            20,
			"expectedVersion": 0, // Wrong - actual is 1
		},
	})

	errFrame := readFrame(t, conn)
	if errFrame.Header.Kind != "response" {
		t.Fatalf("expected kind response, got %s", errFrame.Header.Kind)
	}
	status, _ := errFrame.Payload["status"].(string)
	if status != "error" {
		t.Fatalf("expected status error, got %s", status)
	}
	errObj, _ := errFrame.Payload["error"].(map[string]any)
	code, _ := errObj["code"].(string)
	if code != "data.conflict" {
		t.Fatalf("expected data.conflict, got %s", code)
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
	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "hello_2",
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			V:        2,
		},
		Payload: map[string]any{
			"versions":    []int{2},
			"resumeToken": resumeToken,
		},
	})

	welcome2 := readFrame(t, conn2)
	if welcome2.Header.Resource != "client" || welcome2.Header.Method != "welcome" {
		t.Fatalf("expected client/welcome, got %s/%s", welcome2.Header.Resource, welcome2.Header.Method)
	}

	resumedClientID, _ := welcome2.Payload["clientId"].(string)
	if resumedClientID != clientID {
		t.Fatalf("expected same clientId %s, got %s", clientID, resumedClientID)
	}
	resumed, _ := welcome2.Payload["resumed"].(bool)
	if !resumed {
		t.Fatal("expected resumed: true")
	}
	sessions, _ := welcome2.Payload["sessions"].([]any)
	if len(sessions) != 1 {
		t.Fatalf("expected sessions [s1], got %v", sessions)
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
	_ = readFrame(t, conn1) // session/connected for observer

	// Disconnect client 1
	conn1.Close(websocket.StatusNormalClosure, "")

	// Wait for resume timeout (500ms in test config)
	time.Sleep(700 * time.Millisecond)

	// Observer should have received session/disconnected with reason "timeout"
	disconnected := readFrame(t, conn2)
	if disconnected.Header.Resource != "session" || disconnected.Header.Method != "disconnected" {
		t.Fatalf("expected session/disconnected, got %s/%s", disconnected.Header.Resource, disconnected.Header.Method)
	}
	reason, _ := disconnected.Payload["reason"].(string)
	if reason != "timeout" {
		t.Fatalf("expected reason timeout, got %s", reason)
	}

	// Try to resume with expired token -- should get fresh connection
	conn3 := env.connect(t)
	sendFrame(t, conn3, &starfish.Frame{
		Header: starfish.Header{
			ID:       "hello_3",
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			V:        2,
		},
		Payload: map[string]any{
			"versions":    []int{2},
			"resumeToken": resumeToken,
		},
	})

	welcome3 := readFrame(t, conn3)
	resumed, _ := welcome3.Payload["resumed"].(bool)
	if resumed {
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
	_ = readFrame(t, conn1) // session/connected

	// Send rtc.offer from conn1 to conn2
	to, _ := json.Marshal(id2)
	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "rtc_1",
			Resource: "rtc",
			Method:   "offer",
			Kind:     "event",
			Session:  "s1",
			To:       to,
		},
		Payload: map[string]any{"sdp": "test-sdp"},
	})

	// conn2 should receive the offer
	offer := readFrame(t, conn2)
	if offer.Header.Resource != "rtc" || offer.Header.Method != "offer" {
		t.Fatalf("expected rtc/offer, got %s/%s", offer.Header.Resource, offer.Header.Method)
	}
	if offer.Header.From != id1 {
		t.Fatalf("expected from %s, got %s", id1, offer.Header.From)
	}

	_ = id1 // used above
}
