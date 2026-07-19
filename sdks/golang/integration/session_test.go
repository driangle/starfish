package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestSessionJoinLeave(t *testing.T) {
	url := serverURL(t)
	client := newClient(url, "go-test")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	result, err := client.Join(ctx, uniqueSession("session"), &starfish.JoinOptions{Create: true})
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
