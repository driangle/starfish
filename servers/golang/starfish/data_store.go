package starfish

import (
	"encoding/json"
	"fmt"
	"sync"
)

// DataEntry represents a versioned value in the data store.
type DataEntry struct {
	Data      json.RawMessage
	Version   int64
	UpdatedBy string
}

// ConflictError is returned when an optimistic concurrency check fails.
type ConflictError struct {
	ActualVersion int64
	CurrentData   json.RawMessage
}

func (e *ConflictError) Error() string {
	return fmt.Sprintf("version conflict: actual version is %d", e.ActualVersion)
}

// DataStore is a per-session key-value store with versioning.
type DataStore struct {
	mu      sync.Mutex
	session map[string]*DataEntry            // key -> entry (session scope)
	client  map[string]map[string]*DataEntry // clientId -> key -> entry (self scope)
}

// NewDataStore creates an empty DataStore.
func NewDataStore() *DataStore {
	return &DataStore{
		session: make(map[string]*DataEntry),
		client:  make(map[string]map[string]*DataEntry),
	}
}

// Apply executes a data operation and returns the resulting entry.
func (ds *DataStore) Apply(op, key, scope, clientID string, data json.RawMessage, expectedVersion *int64) (DataEntry, error) {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	store := ds.storeForScope(scope, clientID)

	existing, hasKey := store[key]
	if !hasKey {
		existing = &DataEntry{Version: 0}
	}

	// Optimistic concurrency check
	if expectedVersion != nil {
		if existing.Version != *expectedVersion {
			return DataEntry{}, &ConflictError{
				ActualVersion: existing.Version,
				CurrentData:   existing.Data,
			}
		}
	}

	if op == "delete" {
		delete(store, key)
		return DataEntry{Version: existing.Version + 1, UpdatedBy: clientID}, nil
	}

	newData, err := ds.applyOp(op, existing.Data, data)
	if err != nil {
		return DataEntry{}, err
	}

	entry := &DataEntry{
		Data:      newData,
		Version:   existing.Version + 1,
		UpdatedBy: clientID,
	}
	store[key] = entry

	return *entry, nil
}

// Get retrieves a value from the store.
func (ds *DataStore) Get(key, scope, clientID string) DataEntry {
	ds.mu.Lock()
	defer ds.mu.Unlock()

	store := ds.storeForScope(scope, clientID)
	entry, ok := store[key]
	if !ok {
		return DataEntry{Version: 0}
	}
	return *entry
}

func (ds *DataStore) storeForScope(scope, clientID string) map[string]*DataEntry {
	if scope == "self" {
		if _, ok := ds.client[clientID]; !ok {
			ds.client[clientID] = make(map[string]*DataEntry)
		}
		return ds.client[clientID]
	}
	return ds.session
}

func (ds *DataStore) applyOp(op string, existing, incoming json.RawMessage) (json.RawMessage, error) {
	switch op {
	case "replace":
		return incoming, nil

	case "merge":
		return ds.mergeObjects(existing, incoming)

	case "set.add":
		return ds.setAdd(existing, incoming)

	case "set.remove":
		return ds.setRemove(existing, incoming)

	case "list.add":
		return ds.listAdd(existing, incoming)

	case "list.remove":
		return ds.listRemove(existing, incoming)

	case "counter.add":
		return ds.counterAdd(existing, incoming)

	default:
		return nil, fmt.Errorf("invalid operation: %s", op)
	}
}

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
