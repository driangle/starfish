package starfish

import (
	"encoding/json"
)

func (h *Handler) handlePoolAssign(c *Client, f *Frame) {
	var payload poolAssignPayload
	if f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}
	if err := json.Unmarshal(f.Payload, &payload); err != nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || len(payload.Groups) == 0 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModeDelegated {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolModeMismatch, nil))
		return
	}

	member := pool.GetMember(c.id)
	if member == nil || member.role != "matchmaker" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolRoleRequired, nil))
		return
	}

	// Validate all groups
	for _, group := range payload.Groups {
		if len(group) != pool.groupSize {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolInvalidGroup, nil))
			return
		}
		for _, memberID := range group {
			if !pool.HasMember(memberID) || memberID == c.id {
				c.SendFrame(NewErrorFrame(h.hub.idGen, f.ID, ErrPoolInvalidGroup, nil))
				return
			}
		}
	}

	// Execute all matches
	type matchedGroup struct {
		Group   []string `json:"group"`
		Session string   `json:"session"`
	}
	matched := make([]matchedGroup, 0, len(payload.Groups))

	for _, group := range payload.Groups {
		sessionName, peers := pool.ExecuteMatch(group)
		h.sendPoolMatched(pool.name, sessionName, peers, group)

		for _, id := range group {
			h.broadcastMemberLeft(pool, id, "matched")
		}

		matched = append(matched, matchedGroup{Group: group, Session: sessionName})
	}

	assignedPayload, _ := json.Marshal(struct {
		Pool    string         `json:"pool"`
		Matched []matchedGroup `json:"matched"`
	}{
		Pool:    payload.Pool,
		Matched: matched,
	})
	c.SendFrame(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pool.assigned",
		ReplyTo: f.ID,
		Payload: assignedPayload,
	})
}

// executePoolMatch executes a match: removes members, sends pool.matched, broadcasts pool.member.left.
func (h *Handler) executePoolMatch(pool *Pool, memberIDs []string, replyTo string) {
	sessionName, peers := pool.ExecuteMatch(memberIDs)
	h.sendPoolMatched(pool.name, sessionName, peers, memberIDs)

	for _, id := range memberIDs {
		h.broadcastMemberLeft(pool, id, "matched")
	}

	if pool.IsEmpty() {
		h.hub.RemovePool(pool.name)
	}
}

// processAutoMatches runs the auto-match loop and sends results.
func (h *Handler) processAutoMatches(pool *Pool) {
	results := pool.TryAutoMatch()
	for _, result := range results {
		h.sendPoolMatched(pool.name, result.sessionName, result.peers, result.memberIDs)
	}

	if pool.IsEmpty() {
		h.hub.RemovePool(pool.name)
	}
}

// sendPoolMatched sends pool.matched to each member and clears their pool tracking.
func (h *Handler) sendPoolMatched(poolName, sessionName string, peers []PoolMemberInfo, memberIDs []string) {
	for _, id := range memberIDs {
		client := h.hub.GetClient(id)
		if client == nil {
			continue
		}

		matchedPayload, _ := json.Marshal(struct {
			Pool    string           `json:"pool"`
			Session string           `json:"session"`
			Peers   []PoolMemberInfo `json:"peers"`
		}{
			Pool:    poolName,
			Session: sessionName,
			Peers:   peers,
		})
		client.SendFrame(&Frame{
			V:       1,
			ID:      h.hub.idGen.MessageID(),
			Type:    "pool.matched",
			Payload: matchedPayload,
		})

		client.mu.Lock()
		delete(client.pools, poolName)
		client.mu.Unlock()
	}
}

// broadcastMemberLeft broadcasts pool.member.left to visible members.
func (h *Handler) broadcastMemberLeft(pool *Pool, clientID string, reason string) {
	leftPayload, _ := json.Marshal(struct {
		Pool     string `json:"pool"`
		MemberID string `json:"memberId"`
		Reason   string `json:"reason"`
	}{
		Pool:     pool.name,
		MemberID: clientID,
		Reason:   reason,
	})

	pool.BroadcastVisible(&Frame{
		V:       1,
		ID:      h.hub.idGen.MessageID(),
		Type:    "pool.member.left",
		Payload: leftPayload,
	}, "")
}
