package starfish

import (
	"time"
)

func (h *Handler) handlePing(c *Client, f *Frame) {
	ts := time.Now().UnixMilli()
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "heartbeat",
			Method:   "pong",
			Kind:     "response",
			ReplyTo:  f.Header.ID,
			Ts:       &ts,
		},
		Payload: map[string]any{
			"status": "ok",
		},
	})
}

func (h *Handler) handleClockSync(c *Client, f *Frame) {
	ts := time.Now().UnixMilli()
	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "clock",
			Method:   "sync",
			Kind:     "response",
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status":     "ok",
			"serverTime": ts,
		},
	})
}

func (h *Handler) handleAck(c *Client, f *Frame) {
	h.routeReply(c, f)
}

func (h *Handler) handleNack(c *Client, f *Frame) {
	h.routeReply(c, f)
}

// routeReply forwards an ack/nack frame to the original sender.
func (h *Handler) routeReply(c *Client, f *Frame) {
	if f.Header.ReplyTo == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, f.Header.Resource, f.Header.Method, ErrProtocolInvalidFrame, nil))
		return
	}

	// Set the from field to the acknowledging client
	f.Header.From = c.id

	// Route to the target -- ack/nack goes back to whoever sent the original message.
	targets, err := ParseTo(f.Header.To)
	if err != nil || len(targets) == 0 {
		// If no explicit target, we can't route the ack
		return
	}

	for _, targetID := range targets {
		target := h.hub.GetClient(targetID)
		if target != nil {
			target.SendFrame(f)
		}
	}
}
