package starfish

func (h *Handler) handlePoolAssign(c *Client, f *Frame) {
	payload, err := payloadAs[poolAssignPayload](f)
	if err != nil || f.Payload == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrProtocolInvalidFrame, nil))
		return
	}

	if payload.Pool == "" || len(payload.Groups) == 0 {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrProtocolInvalidFrame, nil))
		return
	}

	pool := h.hub.GetPool(payload.Pool)
	if pool == nil {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrPoolNotFound, nil))
		return
	}

	if pool.mode != PoolModeDelegated {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrPoolModeMismatch, nil))
		return
	}

	member := pool.GetMember(c.id)
	if member == nil || member.role != "matchmaker" {
		c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrPoolRoleRequired, nil))
		return
	}

	// Validate all groups: wrong size is an invalid group; an unknown member
	// (including the matchmaker assigning itself) is a missing target.
	for _, group := range payload.Groups {
		if len(group) != pool.groupSize {
			c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrPoolInvalidGroup, nil))
			return
		}
		for _, memberID := range group {
			if !pool.HasMember(memberID) || memberID == c.id {
				c.SendFrame(NewErrorFrame(h.hub.idGen, f.Header.ID, "pool", "assign", ErrPoolTargetNotFound, nil))
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

	c.SendFrame(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "pool",
			Method:   "assign",
			Kind:     "response",
			ReplyTo:  f.Header.ID,
		},
		Payload: map[string]any{
			"status":  "ok",
			"pool":    payload.Pool,
			"matched": matched,
		},
	})
}

// executePoolMatch executes a match: removes members, sends pool.matched, broadcasts pool.member-left.
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
//
// An auto pool is a persistent queue: it is not destroyed when it drains to
// empty via matching, only when its last member explicitly leaves. Keeping the
// pool alive lets later operations (e.g. a stray pool.claim) see its mode and
// respond with pool.mode_mismatch rather than pool.not_found.
func (h *Handler) processAutoMatches(pool *Pool) {
	results := pool.TryAutoMatch()
	for _, result := range results {
		h.sendPoolMatched(pool.name, result.sessionName, result.peers, result.memberIDs)
	}
}

// sendPoolMatched sends pool.matched event to each member and clears their pool tracking.
func (h *Handler) sendPoolMatched(poolName, sessionName string, peers []PoolMemberInfo, memberIDs []string) {
	for _, id := range memberIDs {
		client := h.hub.GetClient(id)
		if client == nil {
			continue
		}

		// Each member sees the other members of the group, not itself.
		otherPeers := make([]PoolMemberInfo, 0, len(peers))
		for _, p := range peers {
			if p.ID != id {
				otherPeers = append(otherPeers, p)
			}
		}

		client.SendFrame(&Frame{
			Header: Header{
				ID:       h.hub.idGen.MessageID(),
				Resource: "pool",
				Method:   "matched",
				Kind:     "event",
			},
			Payload: map[string]any{
				"pool":    poolName,
				"session": sessionName,
				"peers":   otherPeers,
			},
		})

		client.mu.Lock()
		delete(client.pools, poolName)
		client.mu.Unlock()
	}
}

// broadcastMemberLeft broadcasts pool.member-left to visible members.
func (h *Handler) broadcastMemberLeft(pool *Pool, clientID string, reason string) {
	pool.BroadcastVisible(&Frame{
		Header: Header{
			ID:       h.hub.idGen.MessageID(),
			Resource: "pool",
			Method:   "member-left",
			Kind:     "event",
		},
		Payload: map[string]any{
			"pool":     pool.name,
			"memberId": clientID,
			"reason":   reason,
		},
	}, "")
}
