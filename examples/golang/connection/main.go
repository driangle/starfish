// Connection Example
// ------------------
// Demonstrates: client setup, handshake, session join/leave, connection state
// tracking, and observing peers as they come and go.
//
// Run:      go run ./connection
// Requires: a Starfish server at ws://localhost:8080/starfish (STARFISH_SERVER_URL to override).
package main

import (
	"context"
	"log"
	"time"

	"github.com/driangle/starfish/examples/golang/internal/common"
	"github.com/driangle/starfish/sdks/golang/starfish"
)

func main() {
	// Create a client with identity metadata. Unlike the other examples, we
	// build the client inline here because client setup *is* the subject.
	client := starfish.NewClient(starfish.ClientOptions{
		Server: common.ServerURL(),
		Client: &starfish.ClientIdentity{
			Name: "connection-example",
			Role: "demo",
			Meta: map[string]any{"version": 1},
		},
	})

	// Observe connection state changes (disconnected → connecting → connected).
	unsub := client.OnConnectionChange(func(state starfish.ConnectionState) {
		log.Printf("connection state: %s", state)
	})
	defer unsub()

	// A context bounds how long each network round-trip may take.
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Connect performs the WebSocket handshake plus the client.hello /
	// server.welcome exchange, and starts the heartbeat.
	log.Println("connecting...")
	if err := client.Connect(ctx); err != nil {
		log.Fatalf("connect failed: %v", err)
	}
	log.Printf("connected! client id: %s", client.ClientID())

	// Watch peers joining and leaving. The SDK keeps the client list live from
	// client.connected / client.disconnected events, so Peers() stays current.
	client.On(starfish.EventFilter{Resource: "client"}, func(f *starfish.Frame) {
		log.Printf("session now has %d peer(s)", len(client.Peers()))
	})

	// Join a session -- Create makes it if it does not already exist.
	log.Println("joining session...")
	result, err := client.Join(ctx, "example-session", &starfish.JoinOptions{Create: true})
	if err != nil {
		log.Fatalf("join failed: %v", err)
	}
	log.Printf("joined 'example-session' with %d client(s) present", len(result.Clients))

	// Stay connected briefly to let the heartbeat run and any peers show up.
	log.Println("listening for 3 seconds...")
	time.Sleep(3 * time.Second)

	// Leave the session, then close the connection.
	log.Println("leaving session...")
	if err := client.Leave(ctx); err != nil {
		log.Fatalf("leave failed: %v", err)
	}

	log.Println("disconnecting...")
	client.Disconnect()
	log.Println("done.")
}
