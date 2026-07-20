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

	if welcome.Header.Resource != "client" || welcome.Header.Method != "welcome" {
		t.Fatalf("expected client/welcome, got %s/%s", welcome.Header.Resource, welcome.Header.Method)
	}
	if welcome.Header.Kind != "response" {
		t.Fatalf("expected kind response, got %s", welcome.Header.Kind)
	}
	if welcome.Header.ReplyTo != "hello_1" {
		t.Fatalf("expected replyTo hello_1, got %s", welcome.Header.ReplyTo)
	}

	clientID := getClientID(t, welcome)
	if !strings.HasPrefix(clientID, "client_") {
		t.Fatalf("expected clientId starting with client_, got %s", clientID)
	}

	resumeToken, _ := welcome.Payload["resumeToken"].(string)
	if !strings.HasPrefix(resumeToken, "rt_") {
		t.Fatalf("expected resumeToken starting with rt_, got %s", resumeToken)
	}

	heartbeatInterval, _ := welcome.Payload["heartbeatInterval"].(float64)
	if int64(heartbeatInterval) != 5000 {
		t.Fatalf("expected heartbeatInterval 5000, got %v", heartbeatInterval)
	}

	serverTime, _ := welcome.Payload["serverTime"].(float64)
	if serverTime == 0 {
		t.Fatal("expected non-zero serverTime")
	}

	status, _ := welcome.Payload["status"].(string)
	if status != "ok" {
		t.Fatalf("expected status ok, got %s", status)
	}
}

func TestSessionJoinLeave(t *testing.T) {
	env := newTestEnv(t)

	// Client 1 connects and joins
	conn1 := env.connect(t)
	hello(t, conn1, "client-1")
	joined := joinSession(t, conn1, "test-session")

	if joined.Header.Resource != "session" || joined.Header.Method != "join" || joined.Header.Kind != "response" {
		t.Fatalf("expected session/join/response, got %s/%s/%s", joined.Header.Resource, joined.Header.Method, joined.Header.Kind)
	}

	// Client 2 connects and joins same session
	conn2 := env.connect(t)
	hello(t, conn2, "client-2")
	joined2 := joinSession(t, conn2, "test-session")

	if joined2.Header.Resource != "session" || joined2.Header.Method != "join" {
		t.Fatalf("expected session/join, got %s/%s", joined2.Header.Resource, joined2.Header.Method)
	}

	// Client 1 should receive session/connected event
	connected := readFrame(t, conn1)
	if connected.Header.Resource != "session" || connected.Header.Method != "connected" || connected.Header.Kind != "event" {
		t.Fatalf("expected session/connected/event, got %s/%s/%s", connected.Header.Resource, connected.Header.Method, connected.Header.Kind)
	}

	// Client 2 leaves
	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "leave_1",
			Resource: "session",
			Method:   "leave",
			Kind:     "request",
			Session:  "test-session",
		},
	})

	// Client 2 receives session/leave response
	left := readFrame(t, conn2)
	if left.Header.Resource != "session" || left.Header.Method != "leave" || left.Header.Kind != "response" {
		t.Fatalf("expected session/leave/response, got %s/%s/%s", left.Header.Resource, left.Header.Method, left.Header.Kind)
	}

	// Client 1 should receive session/disconnected event
	disconnected := readFrame(t, conn1)
	if disconnected.Header.Resource != "session" || disconnected.Header.Method != "disconnected" || disconnected.Header.Kind != "event" {
		t.Fatalf("expected session/disconnected/event, got %s/%s/%s", disconnected.Header.Resource, disconnected.Header.Method, disconnected.Header.Kind)
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
	_ = readFrame(t, conn1) // session/connected event for conn2

	// Subscribe conn2 to "lights"
	sendFrame(t, conn2, &starfish.Frame{
		Header: starfish.Header{
			ID:       "sub_1",
			Resource: "topic",
			Method:   "subscribe",
			Kind:     "request",
			Session:  "s1",
			Topic:    "lights",
		},
	})
	subscribed := readFrame(t, conn2)
	if subscribed.Header.Resource != "topic" || subscribed.Header.Method != "subscribe" || subscribed.Header.Kind != "response" {
		t.Fatalf("expected topic/subscribe/response, got %s/%s/%s", subscribed.Header.Resource, subscribed.Header.Method, subscribed.Header.Kind)
	}

	// Read topic/peers event
	peers := readFrame(t, conn2)
	if peers.Header.Resource != "topic" || peers.Header.Method != "peers" || peers.Header.Kind != "event" {
		t.Fatalf("expected topic/peers/event, got %s/%s/%s", peers.Header.Resource, peers.Header.Method, peers.Header.Kind)
	}

	// Publish from conn1
	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "pub_1",
			Resource: "topic",
			Method:   "publish",
			Kind:     "request",
			Session:  "s1",
			Topic:    "lights",
		},
		Payload: map[string]any{"cue": "blackout"},
	})

	// conn2 should receive topic/message event
	msg := readFrame(t, conn2)
	if msg.Header.Resource != "topic" || msg.Header.Method != "message" || msg.Header.Kind != "event" {
		t.Fatalf("expected topic/message/event, got %s/%s/%s", msg.Header.Resource, msg.Header.Method, msg.Header.Kind)
	}
	if msg.Header.Topic != "lights" {
		t.Fatalf("expected topic lights, got %s", msg.Header.Topic)
	}
}

func TestDirectMessage(t *testing.T) {
	env := newTestEnv(t)

	conn1 := env.connect(t)
	hello(t, conn1, "sender")
	joinSession(t, conn1, "s1")

	conn2 := env.connect(t)
	w2 := hello(t, conn2, "receiver")
	client2ID := getClientID(t, w2)
	joinSession(t, conn2, "s1")
	_ = readFrame(t, conn1) // session/connected

	// Send direct message
	to, _ := json.Marshal(client2ID)
	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "dm_1",
			Resource: "message",
			Method:   "send",
			Kind:     "request",
			Session:  "s1",
			To:       to,
		},
		Payload: map[string]any{"gesture": "freeze"},
	})

	// conn2 should receive message/message event
	msg := readFrame(t, conn2)
	if msg.Header.Resource != "message" || msg.Header.Method != "message" || msg.Header.Kind != "event" {
		t.Fatalf("expected message/message/event, got %s/%s/%s", msg.Header.Resource, msg.Header.Method, msg.Header.Kind)
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
	_ = readFrame(t, conn1) // session/connected

	// Broadcast
	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "bc_1",
			Resource: "session",
			Method:   "broadcast",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{"cue": "start"},
	})

	msg := readFrame(t, conn2)
	if msg.Header.Resource != "session" || msg.Header.Method != "broadcast" || msg.Header.Kind != "event" {
		t.Fatalf("expected session/broadcast/event, got %s/%s/%s", msg.Header.Resource, msg.Header.Method, msg.Header.Kind)
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
	_ = readFrame(t, conn1) // session/connected

	// Set presence from conn1
	sendFrame(t, conn1, &starfish.Frame{
		Header: starfish.Header{
			ID:       "pres_1",
			Resource: "presence",
			Method:   "set",
			Kind:     "request",
			Session:  "s1",
		},
		Payload: map[string]any{"x": 0.5, "y": 0.8},
	})

	// Both clients should receive presence/updated event (after throttle)
	msg := readFrame(t, conn1)
	if msg.Header.Resource != "presence" || msg.Header.Method != "updated" || msg.Header.Kind != "event" {
		t.Fatalf("expected presence/updated/event, got %s/%s/%s", msg.Header.Resource, msg.Header.Method, msg.Header.Kind)
	}

	msg2 := readFrame(t, conn2)
	if msg2.Header.Resource != "presence" || msg2.Header.Method != "updated" || msg2.Header.Kind != "event" {
		t.Fatalf("expected presence/updated/event, got %s/%s/%s", msg2.Header.Resource, msg2.Header.Method, msg2.Header.Kind)
	}
}

func TestPingPong(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	ts := time.Now().UnixMilli()
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "ping_1",
			Resource: "heartbeat",
			Method:   "ping",
			Kind:     "request",
			Ts:       &ts,
		},
	})

	pong := readFrame(t, conn)
	if pong.Header.Resource != "heartbeat" || pong.Header.Method != "pong" || pong.Header.Kind != "response" {
		t.Fatalf("expected heartbeat/pong/response, got %s/%s/%s", pong.Header.Resource, pong.Header.Method, pong.Header.Kind)
	}
	if pong.Header.ReplyTo != "ping_1" {
		t.Fatalf("expected replyTo ping_1, got %s", pong.Header.ReplyTo)
	}
}

func TestClockSync(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	ts := time.Now().UnixMilli()
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "clock_1",
			Resource: "clock",
			Method:   "sync",
			Kind:     "request",
			Ts:       &ts,
		},
	})

	synced := readFrame(t, conn)
	if synced.Header.Resource != "clock" || synced.Header.Method != "sync" || synced.Header.Kind != "response" {
		t.Fatalf("expected clock/sync/response, got %s/%s/%s", synced.Header.Resource, synced.Header.Method, synced.Header.Kind)
	}

	serverTime, _ := synced.Payload["serverTime"].(float64)
	if serverTime == 0 {
		t.Fatal("expected non-zero serverTime")
	}
}

func TestSessionNotFoundWithoutCreate(t *testing.T) {
	env := newTestEnv(t)

	conn := env.connect(t)
	hello(t, conn, "client")

	// Try to join non-existent session without create: true
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "join_1",
			Resource: "session",
			Method:   "join",
			Kind:     "request",
			Session:  "nonexistent",
		},
		Payload: map[string]any{
			"create": false,
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
	if code != "session.not_found" {
		t.Fatalf("expected session.not_found, got %s", code)
	}
}

func TestUnsupportedVersion(t *testing.T) {
	env := newTestEnv(t)
	conn := env.connect(t)

	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "bad_1",
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			V:        1,
		},
		Payload: map[string]any{
			"versions": []int{99},
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
	if code != "protocol.unsupported_version" {
		t.Fatalf("expected protocol.unsupported_version, got %s", code)
	}
}
