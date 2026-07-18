package starfish

type poolEnterPayload struct {
	Pool       string         `json:"pool"`
	Create     bool           `json:"create"`
	Mode       string         `json:"mode"`
	GroupSize  int            `json:"groupSize"`
	Role       string         `json:"role"`
	Attributes map[string]any `json:"attributes"`
	Filter     map[string]any `json:"filter"`
}

type poolLeavePayload struct {
	Pool string `json:"pool"`
}

type poolClaimPayload struct {
	Pool   string `json:"pool"`
	Target string `json:"target"`
}

type poolAcceptPayload struct {
	Pool string `json:"pool"`
	From string `json:"from"`
}

type poolRejectPayload struct {
	Pool string `json:"pool"`
	From string `json:"from"`
}

type poolAssignPayload struct {
	Pool   string     `json:"pool"`
	Groups [][]string `json:"groups"`
}

func (h *Handler) handlePoolEnter(c *Client, f *Frame) {
	payload, err := payloadAs[poolEnterPayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "enter", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "enter", ErrProtocolInvalidFrame, nil))
		return
	}

	mode := PoolModeAuto
	if payload.Mode != "" {
		switch PoolMode(payload.Mode) {
		case PoolModeAuto, PoolModeClaim, PoolModeMutual, PoolModePropose, PoolModeDelegated:
			mode = PoolMode(payload.Mode)
		default:
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "enter", ErrProtocolInvalidFrame, nil))
			return
		}
	}

	groupSize := payload.GroupSize
	if groupSize < 2 {
		groupSize = 2
	}

	role := payload.Role
	if role == "" {
		role = "member"
	}
	if role == "matchmaker" && mode != PoolModeDelegated {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "enter", ErrPoolModeMismatch, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		if !payload.Create {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "enter", ErrPoolNotFound, nil))
			return
		}
		pool = h.hub.GetOrCreatePool(payload.Pool, mode, groupSize)
	}

	members := pool.AddMember(c, payload.Attributes, payload.Filter, role)

	c.mu.Lock()
	c.pools[payload.Pool] = true
	c.mu.Unlock()

	resp := map[string]any{
		"status":    "ok",
		"pool":      pool.name,
		"mode":      string(pool.mode),
		"groupSize": pool.groupSize,
	}
	if pool.IsClaimBased() {
		resp["members"] = members
	}

	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "pool",
			Method:   "enter",
			Kind:     "response",
			ReplyTo:  f.Header.ID,
		},
		Payload: resp,
	})

	pool.BroadcastVisible(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "pool",
			Method:   "member-joined",
			Kind:     "event",
		},
		Payload: map[string]any{
			"pool": pool.name,
			"member": PoolMemberInfo{
				ID:         c.id,
				Attributes: payload.Attributes,
			},
		},
	}, c.id)

	if pool.mode == PoolModeAuto {
		h.processAutoMatches(pool)
	}
}

func (h *Handler) handlePoolLeave(c *Client, f *Frame) {
	payload, err := payloadAs[poolLeavePayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "leave", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "leave", ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "leave", ErrPoolNotFound, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "leave", ErrPoolNotMember, nil))
		return
	}

	empty := pool.RemoveMember(c.id)

	c.mu.Lock()
	delete(c.pools, payload.Pool)
	c.mu.Unlock()

	h.broadcastMemberLeft(pool, c.id, "left")

	if empty {
		h.hub.RemovePool(payload.Pool)
	}
}
