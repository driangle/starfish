package starfish

// filterMatchLocked checks bidirectional filter compatibility between two members.
func (p *Pool) filterMatchLocked(a, b *PoolMember) bool {
	return checkFilter(a.filter, a.attributes, b.attributes) &&
		checkFilter(b.filter, b.attributes, a.attributes)
}

// checkFilter checks if selfFilter (with selfAttrs for @self resolution) is satisfied by otherAttrs.
func checkFilter(selfFilter map[string]any, selfAttrs map[string]any, otherAttrs map[string]any) bool {
	if len(selfFilter) == 0 {
		return true
	}

	for key, filterVal := range selfFilter {
		expected := filterVal
		if strVal, ok := filterVal.(string); ok && strVal == "@self" {
			if selfAttrs == nil {
				return false
			}
			selfVal, exists := selfAttrs[key]
			if !exists {
				return false
			}
			expected = selfVal
		}

		if otherAttrs == nil {
			return false
		}
		otherVal, exists := otherAttrs[key]
		if !exists {
			return false
		}

		if !valuesEqual(expected, otherVal) {
			return false
		}
	}

	return true
}

// valuesEqual compares two interface values for equality.
func valuesEqual(a, b any) bool {
	switch av := a.(type) {
	case string:
		bv, ok := b.(string)
		return ok && av == bv
	case float64:
		bv, ok := b.(float64)
		return ok && av == bv
	case bool:
		bv, ok := b.(bool)
		return ok && av == bv
	default:
		return false
	}
}
