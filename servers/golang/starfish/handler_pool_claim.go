package starfish

import (
	"encoding/json"
)

func (h *Handler) handlePoolClaim(c *Client, f *Frame) {
	var payload poolClaimPayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.Target == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
		return
	}

	if !pool.IsClaimBased() {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolModeMismatch, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotMember, nil))
		return
	}

	target := pool.GetMember(payload.Target)
	if target == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolTargetNotFound, nil))
		return
	}

	switch pool.mode {
	case PoolModeClaim:
		h.executePoolMatch(pool, []string{c.id, payload.Target}, f.ID)

	case PoolModeMutual:
		mutual := pool.RecordClaim(c.id, payload.Target)
		if mutual {
			h.executePoolMatch(pool, []string{c.id, payload.Target}, f.ID)
		} else {
			pendingPayload, _ := json.Marshal(struct {
				Pool   string `json:"pool"`
				Target string `json:"target"`
			}{
				Pool:   payload.Pool,
				Target: payload.Target,
			})
			c.SendFrame(&Frame{
				V:       1,
				ID:      h.hub.idGen.MessageID(),
				Type:    "pool.claim.pending",
				ReplyTo: f.ID,
				Payload: pendingPayload,
			})
		}

	case PoolModePropose:
		claimer := pool.GetMember(c.id)
		proposalPayload, _ := json.Marshal(struct {
			Pool       string         `json:"pool"`
			From       string         `json:"from"`
			Attributes map[string]any `json:"attributes,omitempty"`
		}{
			Pool:       payload.Pool,
			From:       c.id,
			Attributes: claimer.attributes,
		})
		target.client.SendFrame(&Frame{
			V:       1,
			ID:      h.hub.idGen.MessageID(),
			Type:    "pool.proposal",
			Payload: proposalPayload,
		})
	}
}

func (h *Handler) handlePoolAccept(c *Client, f *Frame) {
	var payload poolAcceptPayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.From == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModePropose {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolModeMismatch, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotMember, nil))
		return
	}

	if !pool.HasMember(payload.From) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolTargetNotFound, nil))
		return
	}

	h.executePoolMatch(pool, []string{payload.From, c.id}, f.ID)
}

func (h *Handler) handlePoolReject(c *Client, f *Frame) {
	var payload poolRejectPayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.From == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModePropose {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolModeMismatch, nil))
		return
	}

	claimer := pool.GetMember(payload.From)
	if claimer == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolTargetNotFound, nil))
		return
	}

	rejectedPayload, _ := json.Marshal(struct {
		Pool   string `json:"pool"`
		Target string `json:"target"`
	}{
		Pool:   payload.Pool,
		Target: c.id,
	})
	claimer.client.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pool.claim.rejected",
		Payload: rejectedPayload,
	})
}
