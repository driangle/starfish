package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestConnectDisconnect(t *testing.T) {
	url := serverURL(t)
	client := newClient(url, "go-test")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	if client.State() != starfish.Connected {
		t.Fatalf("expected connected, got %s", client.State())
	}
	if client.ClientID() == "" {
		t.Fatal("expected non-empty clientID")
	}
}
