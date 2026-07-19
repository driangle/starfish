package starfish

import (
	"context"
	"os"
	"testing"
	"time"
)

// Integration tests require a running Starfish server.
// Set STARFISH_SERVER_URL to enable (e.g., ws://localhost:4080/starfish).

func getServerURL(t *testing.T) string {
	url := os.Getenv("STARFISH_SERVER_URL")
	if url == "" {
		t.Skip("STARFISH_SERVER_URL not set; skipping integration test")
	}
	return url
}

func TestIntegration_ConnectDisconnect(t *testing.T) {
	url := getServerURL(t)
	client := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "go-test", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	if client.State() != Connected {
		t.Fatalf("expected connected, got %s", client.State())
	}
	if client.ClientID() == "" {
		t.Fatal("expected non-empty clientID")
	}
}

func TestIntegration_SessionJoinLeave(t *testing.T) {
	url := getServerURL(t)
	client := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "go-test", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	result, err := client.Join(ctx, "go-integration-test", &JoinOptions{Create: true})
	if err != nil {
		t.Fatalf("join failed: %v", err)
	}
	if result.ClientID == "" {
		t.Fatal("expected clientID in join result")
	}

	if err := client.Leave(ctx); err != nil {
		t.Fatalf("leave failed: %v", err)
	}
}

func TestIntegration_TopicPubSub(t *testing.T) {
	url := getServerURL(t)

	// Two clients in same session
	c1 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "publisher", Role: "test"},
	})
	c2 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "subscriber", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := c1.Connect(ctx); err != nil {
		t.Fatalf("c1 connect failed: %v", err)
	}
	defer c1.Disconnect()

	if err := c2.Connect(ctx); err != nil {
		t.Fatalf("c2 connect failed: %v", err)
	}
	defer c2.Disconnect()

	session := "go-pubsub-test"
	if _, err := c1.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	// Subscribe c2 to topic
	if err := c2.Subscribe(ctx, "test-topic"); err != nil {
		t.Fatalf("subscribe failed: %v", err)
	}

	// Set up receiver
	received := make(chan *Frame, 1)
	c2.On(EventFilter{Resource: "topic", Method: "message", Topic: "test-topic"}, func(f *Frame) {
		received <- f
	})

	// Give subscription time to propagate
	time.Sleep(100 * time.Millisecond)

	// Publish from c1
	if err := c1.Publish(ctx, "test-topic", map[string]any{"hello": "world"}, nil); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	select {
	case f := <-received:
		if f.Payload["hello"] != "world" {
			t.Fatalf("unexpected payload: %v", f.Payload)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for topic message")
	}
}

func TestIntegration_DirectMessaging(t *testing.T) {
	url := getServerURL(t)

	c1 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "sender", Role: "test"},
	})
	c2 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "receiver", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := c1.Connect(ctx); err != nil {
		t.Fatalf("c1 connect failed: %v", err)
	}
	defer c1.Disconnect()

	if err := c2.Connect(ctx); err != nil {
		t.Fatalf("c2 connect failed: %v", err)
	}
	defer c2.Disconnect()

	session := "go-messaging-test"
	if _, err := c1.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	received := make(chan *Frame, 1)
	c2.OnMessage(func(f *Frame) {
		received <- f
	})

	if err := c1.Send(ctx, c2.ClientID(), map[string]any{"msg": "hi"}, nil); err != nil {
		t.Fatalf("send failed: %v", err)
	}

	select {
	case f := <-received:
		if f.Payload["msg"] != "hi" {
			t.Fatalf("unexpected payload: %v", f.Payload)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for direct message")
	}
}

func TestIntegration_Presence(t *testing.T) {
	url := getServerURL(t)

	c1 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "presence-setter", Role: "test"},
	})
	c2 := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "presence-watcher", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := c1.Connect(ctx); err != nil {
		t.Fatalf("c1 connect failed: %v", err)
	}
	defer c1.Disconnect()

	if err := c2.Connect(ctx); err != nil {
		t.Fatalf("c2 connect failed: %v", err)
	}
	defer c2.Disconnect()

	session := "go-presence-test"
	if _, err := c1.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	received := make(chan *Frame, 1)
	c2.OnPresence(func(f *Frame) {
		if f.Header.From == c1.ClientID() {
			received <- f
		}
	})

	if err := c1.SetPresence(ctx, map[string]any{"status": "ready"}); err != nil {
		t.Fatalf("set presence failed: %v", err)
	}

	select {
	case f := <-received:
		if f.Payload["status"] != "ready" {
			t.Fatalf("unexpected presence payload: %v", f.Payload)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for presence update")
	}
}

func TestIntegration_DataSaveGet(t *testing.T) {
	url := getServerURL(t)

	client := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "data-test", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	if _, err := client.Join(ctx, "go-data-test", &JoinOptions{Create: true}); err != nil {
		t.Fatalf("join failed: %v", err)
	}

	// Save
	saveResult, err := client.Save(ctx, &SaveOptions{
		Key:   "score",
		Scope: ScopeSession,
		Op:    OpReplace,
		Data:  42,
	})
	if err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if saveResult.Version < 1 {
		t.Fatalf("expected version >= 1, got %d", saveResult.Version)
	}

	// Get
	getResult, err := client.Get(ctx, &GetOptions{
		Key:   "score",
		Scope: ScopeSession,
	})
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if getResult.Data != float64(42) {
		t.Fatalf("unexpected data: %v", getResult.Data)
	}
}

func TestIntegration_ClockSync(t *testing.T) {
	url := getServerURL(t)

	client := NewClient(ClientOptions{
		Server: url,
		Client: &ClientIdentity{Name: "clock-test", Role: "test"},
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	if err := client.ClockSync(ctx); err != nil {
		t.Fatalf("clock sync failed: %v", err)
	}

	serverNow := client.ClockNow()
	localNow := time.Now().UnixMilli()

	// Should be within a reasonable range (10s)
	diff := serverNow - localNow
	if diff < -10000 || diff > 10000 {
		t.Fatalf("clock drift too large: %dms", diff)
	}
}
