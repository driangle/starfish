package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestDirectMessaging(t *testing.T) {
	url := serverURL(t)

	c1 := newClient(url, "sender")
	c2 := newClient(url, "receiver")

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

	session := uniqueSession("messaging")
	if _, err := c1.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	received := make(chan *starfish.Frame, 1)
	c2.OnMessage(func(f *starfish.Frame) {
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
