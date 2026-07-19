package starfish

import (
	"testing"
	"time"
)

func TestComputeReconnectDelay_FirstAttempt(t *testing.T) {
	opts := DefaultReconnectOptions()
	delay := computeReconnectDelay(0, opts)

	// First attempt: baseDelay * 2^0 + jitter = 1000..2000ms
	if delay < 1000*time.Millisecond || delay > 2000*time.Millisecond {
		t.Fatalf("unexpected delay for attempt 0: %v", delay)
	}
}

func TestComputeReconnectDelay_ExponentialGrowth(t *testing.T) {
	opts := DefaultReconnectOptions()

	d0 := computeReconnectDelay(0, opts)
	d3 := computeReconnectDelay(3, opts)

	if d3 <= d0 {
		t.Fatalf("expected delay to grow: attempt 0=%v, attempt 3=%v", d0, d3)
	}
}

func TestComputeReconnectDelay_CappedAtMax(t *testing.T) {
	opts := DefaultReconnectOptions()
	delay := computeReconnectDelay(20, opts)

	maxDelay := time.Duration(opts.MaxDelay) * time.Millisecond
	if delay > maxDelay {
		t.Fatalf("delay %v exceeds max %v", delay, maxDelay)
	}
}

func TestComputeReconnectDelay_Disabled(t *testing.T) {
	opts := ReconnectOptions{Enabled: false}
	delay := computeReconnectDelay(0, opts)

	if delay != 0 {
		t.Fatalf("expected 0 delay when disabled, got %v", delay)
	}
}

func TestComputeReconnectDelay_MaxRetriesExceeded(t *testing.T) {
	opts := ReconnectOptions{
		Enabled:    true,
		MaxRetries: 3,
		BaseDelay:  1000,
		MaxDelay:   30000,
	}

	delay := computeReconnectDelay(3, opts)
	if delay != 0 {
		t.Fatalf("expected 0 delay when maxRetries exceeded, got %v", delay)
	}

	delay = computeReconnectDelay(2, opts)
	if delay == 0 {
		t.Fatal("expected non-zero delay within retry limit")
	}
}

func TestComputeReconnectDelay_InfiniteRetries(t *testing.T) {
	opts := DefaultReconnectOptions() // MaxRetries: -1
	delay := computeReconnectDelay(100, opts)

	if delay == 0 {
		t.Fatal("expected non-zero delay with infinite retries")
	}
}
