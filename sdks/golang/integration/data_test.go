package integration

import (
	"context"
	"testing"
	"time"

	"github.com/driangle/starfish/sdks/golang/starfish"
)

func TestDataSaveGet(t *testing.T) {
	url := serverURL(t)

	client := newClient(url, "data-test")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Connect(ctx); err != nil {
		t.Fatalf("connect failed: %v", err)
	}
	defer client.Disconnect()

	if _, err := client.Join(ctx, uniqueSession("data"), &starfish.JoinOptions{Create: true}); err != nil {
		t.Fatalf("join failed: %v", err)
	}

	saveResult, err := client.Save(ctx, &starfish.SaveOptions{
		Key:   "score",
		Scope: starfish.ScopeSession,
		Op:    starfish.OpReplace,
		Data:  42,
	})
	if err != nil {
		t.Fatalf("save failed: %v", err)
	}
	if saveResult.Version < 1 {
		t.Fatalf("expected version >= 1, got %d", saveResult.Version)
	}

	getResult, err := client.Get(ctx, &starfish.GetOptions{
		Key:   "score",
		Scope: starfish.ScopeSession,
	})
	if err != nil {
		t.Fatalf("get failed: %v", err)
	}
	if getResult.Data != float64(42) {
		t.Fatalf("unexpected data: %v", getResult.Data)
	}
}
