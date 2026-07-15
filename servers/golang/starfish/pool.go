package starfish

import (
	"sync"
	"time"
)

// PoolMode represents the matching strategy for a pool.
type PoolMode string

const (
	PoolModeAuto      PoolMode = "auto"
	PoolModeClaim     PoolMode = "claim"
	PoolModeMutual    PoolMode = "mutual"
	PoolModePropose   PoolMode = "propose"
	PoolModeDelegated PoolMode = "delegated"
)

// PoolMember represents a client waiting in the pool.
type PoolMember struct {
	client     *Client
	attributes map[string]any
	filter     map[string]any
	role       string
	joinedAt   time.Time
}

// PoolMemberInfo is the wire representation of a pool member.
type PoolMemberInfo struct {
	ID         string         `json:"id"`
	Attributes map[string]any `json:"attributes,omitempty"`
}

// Pool is a named matchmaking queue.
type Pool struct {
	mu        sync.RWMutex
	name      string
	mode      PoolMode
	groupSize int
	members   map[string]*PoolMember     // clientID -> *PoolMember
	order     []string                   // FIFO order of client IDs
	claims    map[string]map[string]bool // claimerID -> set of targetIDs (mutual mode)
	hub       *Server
}

// NewPool creates a new pool.
func NewPool(name string, mode PoolMode, groupSize int, hub *Server) *Pool {
	return &Pool{
		name:      name,
		mode:      mode,
		groupSize: groupSize,
		members:   make(map[string]*PoolMember),
		claims:    make(map[string]map[string]bool),
		hub:       hub,
	}
}

// AddMember adds a client to the pool. Returns current member list.
func (p *Pool) AddMember(c *Client, attrs map[string]any, filter map[string]any, role string) []PoolMemberInfo {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.members[c.id] = &PoolMember{
		client:     c,
		attributes: attrs,
		filter:     filter,
		role:       role,
		joinedAt:   time.Now(),
	}
	p.order = append(p.order, c.id)

	return p.memberInfosLocked()
}

// RestoreMember re-adds a client from a resume entry.
func (p *Pool) RestoreMember(c *Client, attrs map[string]any, filter map[string]any, role string) {
	p.mu.Lock()
	defer p.mu.Unlock()

	p.members[c.id] = &PoolMember{
		client:     c,
		attributes: attrs,
		filter:     filter,
		role:       role,
		joinedAt:   time.Now(),
	}
	p.order = append(p.order, c.id)
}

// RemoveMember removes a client from the pool and clears their claims.
// Returns true if the pool is now empty.
func (p *Pool) RemoveMember(clientID string) bool {
	p.mu.Lock()
	defer p.mu.Unlock()

	delete(p.members, clientID)
	p.removeFromOrder(clientID)

	// Clear claims involving this client
	delete(p.claims, clientID)
	for _, targets := range p.claims {
		delete(targets, clientID)
	}

	return len(p.members) == 0
}

// removeFromOrder removes a client ID from the FIFO order slice.
func (p *Pool) removeFromOrder(clientID string) {
	for i, id := range p.order {
		if id == clientID {
			p.order = append(p.order[:i], p.order[i+1:]...)
			return
		}
	}
}

// HasMember returns whether the client is in this pool.
func (p *Pool) HasMember(clientID string) bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	_, ok := p.members[clientID]
	return ok
}

// GetMember returns a pool member by client ID.
func (p *Pool) GetMember(clientID string) *PoolMember {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.members[clientID]
}

// MemberInfos returns all members as wire-format info.
func (p *Pool) MemberInfos() []PoolMemberInfo {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return p.memberInfosLocked()
}

func (p *Pool) memberInfosLocked() []PoolMemberInfo {
	infos := make([]PoolMemberInfo, 0, len(p.members))
	for _, m := range p.members {
		infos = append(infos, PoolMemberInfo{
			ID:         m.client.id,
			Attributes: m.attributes,
		})
	}
	return infos
}

// IsClaimBased returns whether the pool uses claim-based matching.
func (p *Pool) IsClaimBased() bool {
	return p.mode == PoolModeClaim || p.mode == PoolModeMutual || p.mode == PoolModePropose
}

// BroadcastVisible sends a frame to members based on mode visibility rules.
// Auto: nobody. Claim-based: all members. Delegated: matchmakers only.
func (p *Pool) BroadcastVisible(f *Frame, excludeID string) {
	p.mu.RLock()
	defer p.mu.RUnlock()

	switch p.mode {
	case PoolModeAuto:
		return
	case PoolModeDelegated:
		for id, m := range p.members {
			if id != excludeID && m.role == "matchmaker" {
				m.client.SendFrame(f)
			}
		}
	default:
		for id, m := range p.members {
			if id != excludeID {
				m.client.SendFrame(f)
			}
		}
	}
}

// IsEmpty returns whether the pool has no members.
func (p *Pool) IsEmpty() bool {
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.members) == 0
}
