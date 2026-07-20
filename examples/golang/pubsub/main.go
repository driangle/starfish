// Pub/Sub Example
// ---------------
// Demonstrates: topic subscribe, publish, and message handling.
//
// Two clients join the same session. One publishes messages to a topic; the
// other subscribes and prints what it receives.
//
// Run:      go run ./pubsub
// Requires: a Starfish server at ws://localhost:8080/starfish (STARFISH_SERVER_URL to override).
package main

import (
	"context"
	"log"
	"time"

	"github.com/driangle/starfish/examples/golang/internal/common"
	"github.com/driangle/starfish/sdks/golang/starfish"
)

const (
	session = "pubsub-demo"
	topic   = "chat"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	publisher := common.NewClient("publisher")
	subscriber := common.NewClient("subscriber")

	// Connect both clients and join the same session.
	mustConnectAndJoin(ctx, publisher, session)
	mustConnectAndJoin(ctx, subscriber, session)
	defer publisher.Disconnect()
	defer subscriber.Disconnect()
	log.Println("both clients connected and joined the session")

	// Incoming topic messages arrive as frames on the event bus. Filter by
	// resource "topic", method "message", and the topic name. The sender's id
	// is on the frame header; the message body is the frame payload.
	subscriber.On(
		starfish.EventFilter{Resource: "topic", Method: "message", Topic: topic},
		func(f *starfish.Frame) {
			log.Printf("[recv from %s] %v", f.Header.From, f.Payload["text"])
		},
	)

	// Subscribe, then give the subscription a moment to propagate to the server.
	if err := subscriber.Subscribe(ctx, topic); err != nil {
		log.Fatalf("subscribe failed: %v", err)
	}
	log.Printf("subscriber listening on %q", topic)
	time.Sleep(200 * time.Millisecond)

	// Publish a few messages. Publish is fire-and-forget (no server ack).
	for _, text := range []string{"Hello from publisher!", "How is everyone?", "Goodbye!"} {
		log.Printf("publishing: %q", text)
		if err := publisher.Publish(ctx, topic, map[string]any{"text": text}, nil); err != nil {
			log.Fatalf("publish failed: %v", err)
		}
		time.Sleep(300 * time.Millisecond)
	}

	// Unsubscribe when done.
	if err := subscriber.Unsubscribe(ctx, topic); err != nil {
		log.Fatalf("unsubscribe failed: %v", err)
	}
	log.Printf("subscriber unsubscribed from %q", topic)
	log.Println("done.")
}

// mustConnectAndJoin connects a client and joins the session, or exits on error.
func mustConnectAndJoin(ctx context.Context, c *starfish.Client, session string) {
	if err := c.Connect(ctx); err != nil {
		log.Fatalf("connect failed: %v", err)
	}
	if _, err := c.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		log.Fatalf("join failed: %v", err)
	}
}
