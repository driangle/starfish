package starfish

import (
	"encoding/json"
	"fmt"
)

func (ds *DataStore) mergeObjects(existing, incoming json.RawMessage) (json.RawMessage, error) {
	base := make(map[string]json.RawMessage)
	if len(existing) > 0 {
		if err := json.Unmarshal(existing, &base); err != nil {
			base = make(map[string]json.RawMessage)
		}
	}

	overlay := make(map[string]json.RawMessage)
	if err := json.Unmarshal(incoming, &overlay); err != nil {
		return nil, fmt.Errorf("merge requires an object")
	}

	for k, v := range overlay {
		base[k] = v
	}

	return json.Marshal(base)
}

func (ds *DataStore) setAdd(existing, incoming json.RawMessage) (json.RawMessage, error) {
	var set []json.RawMessage
	if len(existing) > 0 {
		json.Unmarshal(existing, &set)
	}

	// Check for duplicates using string comparison
	inStr := string(incoming)
	for _, item := range set {
		if string(item) == inStr {
			return json.Marshal(set)
		}
	}

	set = append(set, incoming)
	return json.Marshal(set)
}

func (ds *DataStore) setRemove(existing, incoming json.RawMessage) (json.RawMessage, error) {
	var set []json.RawMessage
	if len(existing) > 0 {
		json.Unmarshal(existing, &set)
	}

	inStr := string(incoming)
	filtered := make([]json.RawMessage, 0, len(set))
	for _, item := range set {
		if string(item) != inStr {
			filtered = append(filtered, item)
		}
	}

	return json.Marshal(filtered)
}

func (ds *DataStore) listAdd(existing, incoming json.RawMessage) (json.RawMessage, error) {
	var list []json.RawMessage
	if len(existing) > 0 {
		json.Unmarshal(existing, &list)
	}

	list = append(list, incoming)
	return json.Marshal(list)
}

func (ds *DataStore) listRemove(existing, incoming json.RawMessage) (json.RawMessage, error) {
	var list []json.RawMessage
	if len(existing) > 0 {
		json.Unmarshal(existing, &list)
	}

	inStr := string(incoming)
	filtered := make([]json.RawMessage, 0, len(list))
	for _, item := range list {
		if string(item) != inStr {
			filtered = append(filtered, item)
		}
	}

	return json.Marshal(filtered)
}

func (ds *DataStore) counterAdd(existing, incoming json.RawMessage) (json.RawMessage, error) {
	var current float64
	if len(existing) > 0 {
		json.Unmarshal(existing, &current)
	}

	var delta float64
	if err := json.Unmarshal(incoming, &delta); err != nil {
		return nil, fmt.Errorf("counter.add requires a number")
	}

	return json.Marshal(current + delta)
}
