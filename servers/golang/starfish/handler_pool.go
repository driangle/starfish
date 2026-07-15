package starfish

import (
	"encoding/json"
)

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
	var payload poolEnterPayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	mode := PoolModeAuto
	if payload.Mode != "" {
		switch PoolMode(payload.Mode) {
		case PoolModeAuto, PoolModeClaim, PoolModeMutual, PoolModePropose, PoolModeDelegated:
			mode = PoolMode(payload.Mode)
		default:
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
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
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolModeMismatch, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		if !payload.Create {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
			return
		}
		pool = h.hub.GetOrCreatePool(payload.Pool, mode, groupSize)
	}

	members := pool.AddMember(c, payload.Attributes, payload.Filter, role)

	c.mu.Lock()
	c.pools[payload.Pool] = true
	c.mu.Unlock()

	type enteredResponse struct {
		Pool      string           `json:"pool"`
		Mode      string           `json:"mode"`
		GroupSize int              `json:"groupSize"`
		Members   []PoolMemberInfo `json:"members,omitempty"`
	}

	resp := enteredResponse{
		Pool:      pool.name,
		Mode:      string(pool.mode),
		GroupSize: pool.groupSize,
	}
	if pool.IsClaimBased() {
		resp.Members = members
	}

	respPayload, _ := json.Marshal(resp)
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pool.entered",
		ReplyTo: f.ID,
		Payload: respPayload,
	})

	joinedPayload, _ := json.Marshal(struct {
		Pool   string         `json:"pool"`
		Member PoolMemberInfo `json:"member"`
	}{
		Pool: pool.name,
		Member: PoolMemberInfo{
			ID:         c.id,
			Attributes: payload.Attributes,
		},
	})
	pool.BroadcastVisible(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pool.member.joined",
		Payload: joinedPayload,
	}, c.id)

	if pool.mode == PoolModeAuto {
		h.processAutoMatches(pool)
	}
}

func (h *Handler) handlePoolLeave(c *Client, f *Frame) {
	var payload poolLeavePayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
		return
	}

	if !pool.HasMember(c.id) {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotMember, nil))
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
