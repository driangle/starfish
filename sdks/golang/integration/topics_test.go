package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestTopicPubSub(t *testing.T) {
	url := serverURL(t)

	// Two clients in the same session: one publishes, one subscribes.
	c1 := newClient(url, "publisher")
	c2 := newClient(url, "subscriber")

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

	session := uniqueSession("pubsub")
	if _, err := c1.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c1 join failed: %v", err)
	}
	if _, err := c2.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("c2 join failed: %v", err)
	}

	if err := c2.Subscribe(ctx, "test-topic"); err != nil {
		t.Fatalf("subscribe failed: %v", err)
	}

	received := make(chan *starfish.Frame, 1)
	c2.On(starfish.EventFilter{Resource: "topic", Method: "message", Topic: "test-topic"}, func(f *starfish.Frame) {
		received <- f
	})

	// Give the subscription time to propagate.
	time.Sleep(100 * time.Millisecond)

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
