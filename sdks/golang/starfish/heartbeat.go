package starfish

import (
	"context"
	"time"
)

// heartbeat sends application-level pings at the server-specified interval.
type heartbeat struct {
	conn     *connection
	idg      *IDGenerator
	interval time.Duration
	cancel   context.CancelFunc
}

func newHeartbeat(conn *connection, idg *IDGenerator) *heartbeat {
	return &heartbeat{
		conn: conn,
		idg:  idg,
	}
}

// start begins sending pings at the given interval.
func (h *heartbeat) start(ctx context.Context, intervalMs int) {
	h.stop()

	h.interval = time.Duration(intervalMs) * time.Millisecond
	ctx, cancel := context.WithCancel(ctx)
	h.cancel = cancel

	go h.loop(ctx)
}

func (h *heartbeat) loop(ctx context.Context) {
	ticker := time.NewTicker(h.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			ts := time.Now().UnixMilli()
			frame := &Frame{
				Header: Header{
					V:        1,
					ID:       h.idg.Next("ping"),
					Resource: "heartbeat",
					Method:   "ping",
					Kind:     "request",
					Ts:       &ts,
				},
			}
			_ = h.conn.send(ctx, frame) // best-effort
		}
	}
}

// stop cancels the heartbeat loop.
func (h *heartbeat) stop() {
	if h.cancel != nil {
		h.cancel()
		h.cancel = nil
	}
}
