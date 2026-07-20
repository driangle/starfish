// Presence Example
// ----------------
// Demonstrates: setting presence, tracking peers, and reacting to presence
// changes in real time.
//
// Two clients (Alice and Bob) each publish presence data and observe each
// other's updates.
//
// Run:      go run ./presence
// Requires: a Starfish server at ws://localhost:8080/starfish (STARFISH_SERVER_URL to override).
package main

import (
	"context"
	"log"
	"time"

	"github.com/driangle/starfish/examples/golang/internal/common"
	"github.com/driangle/starfish/sdks/golang/starfish"
)

const session = "presence-demo"

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	alice := common.NewClient("Alice")
	bob := common.NewClient("Bob")

	mustConnectAndJoin(ctx, alice, session)
	mustConnectAndJoin(ctx, bob, session)
	defer alice.Disconnect()
	defer bob.Disconnect()
	log.Println("Alice and Bob joined the session")

	// Alice reacts to any presence update. OnPresence fires for every peer's
	// change; the frame header's From tells us whose presence changed.
	alice.OnPresence(func(f *starfish.Frame) {
		log.Printf("Alice sees %s -> %v", f.Header.From, f.Payload)
	})

	// Give the subscriptions a moment to settle.
	time.Sleep(200 * time.Millisecond)

	// Each client sets and later updates its presence.
	log.Println("Alice sets presence: {status: active, color: blue}")
	set(ctx, alice, map[string]any{"status": "active", "color": "blue"})
	time.Sleep(300 * time.Millisecond)

	log.Println("Bob sets presence: {status: away, color: red}")
	set(ctx, bob, map[string]any{"status": "away", "color": "red"})
	time.Sleep(300 * time.Millisecond)

	log.Println("Alice updates presence: {status: typing, color: blue}")
	set(ctx, alice, map[string]any{"status": "typing", "color": "blue"})
	time.Sleep(300 * time.Millisecond)

	// Presence is also queryable without callbacks: the SDK keeps a live map.
	log.Println("final presence snapshot (from Bob's view):")
	for id, data := range bob.PresenceAll() {
		log.Printf("  %s: %v", id, data)
	}
	log.Println("done.")
}

func set(ctx context.Context, c *starfish.Client, data map[string]any) {
	if err := c.SetPresence(ctx, data); err != nil {
		log.Fatalf("set presence failed: %v", err)
	}
}

func mustConnectAndJoin(ctx context.Context, c *starfish.Client, session string) {
	if err := c.Connect(ctx); err != nil {
		log.Fatalf("connect failed: %v", err)
	}
	if _, err := c.Join(ctx, session, &starfish.JoinOptions{Create: true}); err != nil {
		log.Fatalf("join failed: %v", err)
	}
}
