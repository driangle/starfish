package starfish

func (h *Handler) handlePoolClaim(c *Client, f *Frame) {
	payload, err := payloadAs[poolClaimPayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.Target == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrPoolNotFound, nil))
		return
	}

	if !pool.IsClaimBased() {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrPoolModeMismatch, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrPoolNotMember, nil))
		return
	}

	target := pool.GetMember(payload.Target)
	if target == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "claim", ErrPoolTargetNotFound, nil))
		return
	}

	switch pool.mode {
	case PoolModeClaim:
		h.executePoolMatch(pool, []string{c.id, payload.Target}, f.Header.ID)

	case PoolModeMutual:
		mutual := pool.RecordClaim(c.id, payload.Target)
		if mutual {
			h.executePoolMatch(pool, []string{c.id, payload.Target}, f.Header.ID)
		} else {
			c.SendFrame(&Frame{
				Header: Header{
					ID:       h.hub.idGen.MessageID(),
					Resource: "pool",
					Method:   "claim",
					Kind:     "response",
					ReplyTo:  f.Header.ID,
				},
				Payload: map[string]any{
					"status": "pending",
					"pool":   payload.Pool,
					"target": payload.Target,
				},
			})
		}

	case PoolModePropose:
		claimer := pool.GetMember(c.id)
		target.client.SendFrame(&Frame{
			Header: Header{
				ID:       h.hub.idGen.MessageID(),
				Resource: "pool",
				Method:   "proposal",
				Kind:     "event",
			},
			Payload: map[string]any{
				"pool":       payload.Pool,
				"from":       c.id,
				"attributes": claimer.attributes,
			},
		})
	}
}

func (h *Handler) handlePoolAccept(c *Client, f *Frame) {
	payload, err := payloadAs[poolAcceptPayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.From == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModePropose {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrPoolModeMismatch, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrPoolNotMember, nil))
		return
	}

	if !pool.HasMember(payload.From) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "accept", ErrPoolTargetNotFound, nil))
		return
	}

	h.executePoolMatch(pool, []string{payload.From, c.id}, f.Header.ID)
}

func (h *Handler) handlePoolReject(c *Client, f *Frame) {
	payload, err := payloadAs[poolRejectPayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "reject", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || payload.From == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "reject", ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "reject", ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModePropose {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "reject", ErrPoolModeMismatch, nil))
		return
	}

	claimer := pool.GetMember(payload.From)
	if claimer == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "reject", ErrPoolTargetNotFound, nil))
		return
	}

	claimer.client.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "pool",
			Method:   "claim-rejected",
			Kind:     "event",
		},
		Payload: map[string]any{
			"pool":   payload.Pool,
			"target": c.id,
		},
	})
}
