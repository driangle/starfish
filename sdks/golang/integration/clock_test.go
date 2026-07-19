package integration

import (
	"context"
	"testing"
	"time"
)

func TestClockSync(t *testing.T) {
	url := serverURL(t)

	client := newClient(url, "clock-test")

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

	// Server clock should be within a reasonable range of local time.
	diff := serverNow - localNow
	if diff < -10000 || diff > 10000 {
		t.Fatalf("clock drift too large: %dms", diff)
	}
}
