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
	hub    *starfish.Server
	server *httptest.Server
}

func newTestEnv(t *testing.T) *testEnv {
	t.Helper()
	config := starfish.DefaultConfig()
	config.HeartbeatInterval = 5 * time.Second
	config.HeartbeatTimeout = 10 * time.Second
	config.ResumeTimeout = 500 * time.Millisecond
	config.PresenceThrottleMs = 10 // Fast for tests

	hub := starfish.NewServer(config)
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
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "hello_1",
			Resource: "client",
			Method:   "hello",
			Kind:     "request",
			V:        2,
		},
		Payload: map[string]any{
			"versions": []int{2},
			"client": map[string]any{
				"name": name,
				"role": "test",
			},
		},
	})
	return readFrame(t, conn)
}

// getClientID extracts clientId from a welcome frame's payload.
func getClientID(t *testing.T, welcome *starfish.Frame) string {
	t.Helper()
	id, ok := welcome.Payload["clientId"].(string)
	if !ok {
		t.Fatalf("missing clientId in welcome payload")
	}
	return id
}

// getResumeToken extracts resumeToken from a welcome frame's payload.
func getResumeToken(t *testing.T, welcome *starfish.Frame) string {
	t.Helper()
	token, ok := welcome.Payload["resumeToken"].(string)
	if !ok {
		t.Fatalf("missing resumeToken in welcome payload")
	}
	return token
}

// joinSession joins a session and returns the session join response frame.
func joinSession(t *testing.T, conn *websocket.Conn, sessionName string) *starfish.Frame {
	t.Helper()
	sendFrame(t, conn, &starfish.Frame{
		Header: starfish.Header{
			ID:       "join_1",
			Resource: "session",
			Method:   "join",
			Kind:     "request",
			Session:  sessionName,
		},
		Payload: map[string]any{
			"create": true,
			"name":   "test-client",
			"role":   "test",
		},
	})
	return readFrame(t, conn)
}
