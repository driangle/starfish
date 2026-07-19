package starfish

import (
	"math"
	"math/rand"
	"time"
)

// computeReconnectDelay calculates the delay for a reconnection attempt using
// exponential backoff with jitter. Returns 0 if reconnection is disabled or
// max retries exceeded.
func computeReconnectDelay(attempt int, opts ReconnectOptions) time.Duration {
	if !opts.Enabled {
		return 0
	}
	if opts.MaxRetries >= 0 && float64(attempt) >= opts.MaxRetries {
		return 0
	}

	base := float64(opts.BaseDelay)
	delay := base * math.Pow(2, float64(attempt))
	jitter := rand.Float64() * base
	delay += jitter

	maxDelay := float64(opts.MaxDelay)
	if delay > maxDelay {
		delay = maxDelay
	}

	return time.Duration(delay) * time.Millisecond
}
