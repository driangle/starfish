package starfish

// TryAutoMatch attempts FIFO matching in auto mode.
// Returns matched groups (pairs of member IDs and session names).
// Must be called WITHOUT the pool lock held.
func (p *Pool) TryAutoMatch() []autoMatchResult {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.mode != PoolModeAuto {
		return nil
	}

	var results []autoMatchResult

	for {
		match := p.findNextMatchLocked()
		if match == nil {
			break
		}

		sessionName := p.hub.idGen.SessionName()
		peers := make([]PoolMemberInfo, 0, len(match))
		for _, id := range match {
			m := p.members[id]
			peers = append(peers, PoolMemberInfo{
				ID:         id,
				Attributes: m.attributes,
			})
		}

		// Remove matched members
		for _, id := range match {
			delete(p.members, id)
			p.removeFromOrder(id)
		}

		results = append(results, autoMatchResult{
			sessionName: sessionName,
			memberIDs:   match,
			peers:       peers,
		})
	}

	return results
}

type autoMatchResult struct {
	sessionName string
	memberIDs   []string
	peers       []PoolMemberInfo
}

// findNextMatchLocked scans FIFO order for the first valid group.
func (p *Pool) findNextMatchLocked() []string {
	if len(p.order) < p.groupSize {
		return nil
	}

	// Get waiting members in FIFO order (exclude matchmakers)
	var waiting []string
	for _, id := range p.order {
		m := p.members[id]
		if m != nil && m.role != "matchmaker" {
			waiting = append(waiting, id)
		}
	}

	if len(waiting) < p.groupSize {
		return nil
	}

	if p.groupSize == 2 {
		// Optimize for the common case: find first compatible pair
		for i := 0; i < len(waiting)-1; i++ {
			for j := i + 1; j < len(waiting); j++ {
				a := p.members[waiting[i]]
				b := p.members[waiting[j]]
				if p.filterMatchLocked(a, b) {
					return []string{waiting[i], waiting[j]}
				}
			}
		}
		return nil
	}

	// For groupSize > 2, find first valid group
	return p.findGroupLocked(waiting, p.groupSize)
}

// findGroupLocked finds the first combination of `size` members where all bilateral filters pass.
func (p *Pool) findGroupLocked(candidates []string, size int) []string {
	if size > len(candidates) {
		return nil
	}

	indices := make([]int, size)
	for i := range indices {
		indices[i] = i
	}

	for {
		valid := true
		for i := 0; i < size && valid; i++ {
			for j := i + 1; j < size && valid; j++ {
				a := p.members[candidates[indices[i]]]
				b := p.members[candidates[indices[j]]]
				if !p.filterMatchLocked(a, b) {
					valid = false
				}
			}
		}

		if valid {
			result := make([]string, size)
			for i, idx := range indices {
				result[i] = candidates[idx]
			}
			return result
		}

		// Next combination
		i := size - 1
		for i >= 0 {
			indices[i]++
			if indices[i] <= len(candidates)-size+i {
				break
			}
			i--
		}
		if i < 0 {
			return nil
		}
		for j := i + 1; j < size; j++ {
			indices[j] = indices[j-1] + 1
		}
	}
}

// ExecuteMatch removes matched members and returns match info.
func (p *Pool) ExecuteMatch(memberIDs []string) (sessionName string, peers []PoolMemberInfo) {
	p.mu.Lock()
	defer p.mu.Unlock()

	sessionName = p.hub.idGen.SessionName()
	peers = make([]PoolMemberInfo, 0, len(memberIDs))

	for _, id := range memberIDs {
		m := p.members[id]
		if m != nil {
			peers = append(peers, PoolMemberInfo{
				ID:         id,
				Attributes: m.attributes,
			})
		}
	}

	for _, id := range memberIDs {
		delete(p.members, id)
		p.removeFromOrder(id)
		delete(p.claims, id)
		for _, targets := range p.claims {
			delete(targets, id)
		}
	}

	return sessionName, peers
}

// RecordClaim records a claim for mutual mode. Returns true if mutual claim detected.
func (p *Pool) RecordClaim(claimerID, targetID string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	if p.claims[claimerID] == nil {
		p.claims[claimerID] = make(map[string]bool)
	}
	p.claims[claimerID][targetID] = true

	if targets, ok := p.claims[targetID]; ok && targets[claimerID] {
		return true
	}
	return false
}
