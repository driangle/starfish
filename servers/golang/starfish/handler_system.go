package starfish

import (
	"encoding/json"
	"time"
)

func (h *Handler) handlePing(c *Client, f *Frame) {
	ts := time.Now().UnixMilli()
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pong",
		ReplyTo: f.ID,
		Ts:      &ts,
	})
}

func (h *Handler) handleClockSync(c *Client, f *Frame) {
	ts := time.Now().UnixMilli()
	payload, _ := json.Marshal(struct {
		ServerTime int64 `json:"serverTime"`
	}{
		ServerTime: ts,
	})

	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "clock.synced",
		ReplyTo: f.ID,
		Payload: payload,
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
	if f.ReplyTo == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	// Set the from field to the acknowledging client
	f.From = c.id

	// Route to the target -- ack/nack goes back to whoever sent the original message.
	// We need to find the target client. The `to` field should indicate the target.
	targets, err := ParseTo(f.To)
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
