package starfish

import "encoding/json"

// ResumePoolEntry holds a client's pool membership data for resume.
type ResumePoolEntry struct {
	Attributes map[string]any
	Filter     map[string]any
	Role       string
}

// snapshotPoolState copies pool member data for a disconnecting client.
func (r *ResumeRegistry) snapshotPoolState(clientID string, poolNames map[string]bool) map[string]*ResumePoolEntry {
	entries := make(map[string]*ResumePoolEntry)
	for poolName := range poolNames {
		pool := r.hub.GetPool(poolName)
		if pool == nil {
			continue
		}
		member := pool.GetMember(clientID)
		if member != nil {
			entries[poolName] = &ResumePoolEntry{
				Attributes: member.attributes,
				Filter:     member.filter,
				Role:       member.role,
			}
		}
	}
	return entries
}

// expirePoolMemberships cleans up pool memberships for an expired or disconnected client.
func (r *ResumeRegistry) expirePoolMemberships(clientID string, pools map[string]*ResumePoolEntry, reason string) {
	for poolName := range pools {
		pool := r.hub.GetPool(poolName)
		if pool == nil {
			continue
		}

		empty := pool.RemoveMember(clientID)

		leftPayload, _ := json.Marshal(struct {
			Pool     string `json:"pool"`
			MemberID string `json:"memberId"`
			Reason   string `json:"reason"`
		}{
			Pool:     poolName,
			MemberID: clientID,
			Reason:   reason,
		})

		pool.BroadcastVisible(&Frame{
			V:       1,
			ID:      r.hub.idGen.MessageID(),
			Type:    "pool.member.left",
			Payload: leftPayload,
		}, "")

		if empty {
			r.hub.RemovePool(poolName)
		}
	}
}

// expirePoolMembershipsByName cleans up pool memberships using a name-only map.
func (r *ResumeRegistry) expirePoolMembershipsByName(clientID string, poolNames map[string]bool, reason string) {
	entries := make(map[string]*ResumePoolEntry, len(poolNames))
	for name := range poolNames {
		entries[name] = nil
	}
	r.expirePoolMemberships(clientID, entries, reason)
}
