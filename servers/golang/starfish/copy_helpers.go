package starfish

import "encoding/json"

func copyStringBoolMap(m map[string]bool) map[string]bool {
	if m == nil {
		return nil
	}
	cp := make(map[string]bool, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}

func copyTopicsMap(m map[string]map[string]bool) map[string]map[string]bool {
	if m == nil {
		return nil
	}
	cp := make(map[string]map[string]bool, len(m))
	for k, v := range m {
		cp[k] = copyStringBoolMap(v)
	}
	return cp
}

func copyPresenceMap(m map[string]json.RawMessage) map[string]json.RawMessage {
	if m == nil {
		return nil
	}
	cp := make(map[string]json.RawMessage, len(m))
	for k, v := range m {
		cp[k] = v
	}
	return cp
}
