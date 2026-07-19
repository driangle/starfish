package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestPresence(t *testing.T) {
	url := serverURL(t)

	c1 := newClient(url, "presence-setter")
	c2 := newClient(url, "presence-watcher")

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

	session := uniqueSession("presence")
	if _, err := c1.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	received := make(chan *starfish.Frame, 1)
	c2.OnPresence(func(f *starfish.Frame) {
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
