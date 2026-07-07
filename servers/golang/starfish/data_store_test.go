package starfish

import (
	"encoding/json"
	"testing"
)

func TestDataStoreReplace(t *testing.T) {
	ds := NewDataStore()

	entry, err := ds.Apply("replace", "score", "session", "c1", json.RawMessage(`42`), nil)
	if err != nil {
		t.Fatal(err)
	}
	if entry.Version != 1 {
		t.Fatalf("expected version 1, got %d", entry.Version)
	}
	if string(entry.Data) != "42" {
		t.Fatalf("expected 42, got %s", entry.Data)
	}

	// Replace again
	entry, err = ds.Apply("replace", "score", "session", "c1", json.RawMessage(`100`), nil)
	if err != nil {
		t.Fatal(err)
	}
	if entry.Version != 2 {
		t.Fatalf("expected version 2, got %d", entry.Version)
	}
}

func TestDataStoreMerge(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("replace", "config", "session", "c1", json.RawMessage(`{"a":1,"b":2}`), nil)

	entry, err := ds.Apply("merge", "config", "session", "c1", json.RawMessage(`{"b":3,"c":4}`), nil)
	if err != nil {
		t.Fatal(err)
	}

	var result map[string]float64
	json.Unmarshal(entry.Data, &result)
	if result["a"] != 1 || result["b"] != 3 || result["c"] != 4 {
		t.Fatalf("unexpected merge result: %s", entry.Data)
	}
}

func TestDataStoreCounterAdd(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("counter.add", "points", "session", "c1", json.RawMessage(`10`), nil)
	entry, _ := ds.Apply("counter.add", "points", "session", "c1", json.RawMessage(`5`), nil)

	var val float64
	json.Unmarshal(entry.Data, &val)
	if val != 15 {
		t.Fatalf("expected 15, got %f", val)
	}
}

func TestDataStoreSetAddRemove(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("set.add", "tags", "session", "c1", json.RawMessage(`"a"`), nil)
	ds.Apply("set.add", "tags", "session", "c1", json.RawMessage(`"b"`), nil)
	ds.Apply("set.add", "tags", "session", "c1", json.RawMessage(`"a"`), nil) // Duplicate

	entry := ds.Get("tags", "session", "c1")
	var set []string
	json.Unmarshal(entry.Data, &set)
	if len(set) != 2 {
		t.Fatalf("expected 2 items, got %d: %v", len(set), set)
	}

	ds.Apply("set.remove", "tags", "session", "c1", json.RawMessage(`"a"`), nil)
	entry = ds.Get("tags", "session", "c1")
	json.Unmarshal(entry.Data, &set)
	if len(set) != 1 || set[0] != "b" {
		t.Fatalf("expected [b], got %v", set)
	}
}

func TestDataStoreListAddRemove(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("list.add", "log", "session", "c1", json.RawMessage(`"event1"`), nil)
	ds.Apply("list.add", "log", "session", "c1", json.RawMessage(`"event2"`), nil)
	ds.Apply("list.add", "log", "session", "c1", json.RawMessage(`"event1"`), nil) // Duplicates allowed in list

	entry := ds.Get("log", "session", "c1")
	var list []string
	json.Unmarshal(entry.Data, &list)
	if len(list) != 3 {
		t.Fatalf("expected 3 items, got %d", len(list))
	}

	ds.Apply("list.remove", "log", "session", "c1", json.RawMessage(`"event1"`), nil)
	entry = ds.Get("log", "session", "c1")
	json.Unmarshal(entry.Data, &list)
	if len(list) != 1 || list[0] != "event2" {
		t.Fatalf("expected [event2], got %v", list)
	}
}

func TestDataStoreDelete(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("replace", "tmp", "session", "c1", json.RawMessage(`"value"`), nil)
	entry, _ := ds.Apply("delete", "tmp", "session", "c1", nil, nil)

	if entry.Version != 2 {
		t.Fatalf("expected version 2, got %d", entry.Version)
	}

	got := ds.Get("tmp", "session", "c1")
	if got.Version != 0 {
		t.Fatalf("expected version 0 for deleted key, got %d", got.Version)
	}
}

func TestDataStoreOptimisticConcurrency(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("replace", "x", "session", "c1", json.RawMessage(`1`), nil)

	// Correct version
	v := int64(1)
	_, err := ds.Apply("replace", "x", "session", "c1", json.RawMessage(`2`), &v)
	if err != nil {
		t.Fatalf("expected success, got %v", err)
	}

	// Wrong version
	v = int64(1)
	_, err = ds.Apply("replace", "x", "session", "c1", json.RawMessage(`3`), &v)
	if err == nil {
		t.Fatal("expected conflict error")
	}
	conflict, ok := err.(*ConflictError)
	if !ok {
		t.Fatalf("expected ConflictError, got %T", err)
	}
	if conflict.ActualVersion != 2 {
		t.Fatalf("expected actual version 2, got %d", conflict.ActualVersion)
	}
}

func TestDataStoreScopeIsolation(t *testing.T) {
	ds := NewDataStore()

	ds.Apply("replace", "secret", "self", "c1", json.RawMessage(`"mine"`), nil)
	ds.Apply("replace", "secret", "self", "c2", json.RawMessage(`"yours"`), nil)

	e1 := ds.Get("secret", "self", "c1")
	e2 := ds.Get("secret", "self", "c2")

	if string(e1.Data) != `"mine"` {
		t.Fatalf("expected mine, got %s", e1.Data)
	}
	if string(e2.Data) != `"yours"` {
		t.Fatalf("expected yours, got %s", e2.Data)
	}

	// Session scope is separate
	ds.Apply("replace", "secret", "session", "c1", json.RawMessage(`"shared"`), nil)
	es := ds.Get("secret", "session", "c1")
	if string(es.Data) != `"shared"` {
		t.Fatalf("expected shared, got %s", es.Data)
	}
}

func TestDataStoreNewKeyExpectedVersion(t *testing.T) {
	ds := NewDataStore()

	// expectedVersion 0 for a new key should succeed
	v := int64(0)
	_, err := ds.Apply("replace", "new", "session", "c1", json.RawMessage(`"first"`), &v)
	if err != nil {
		t.Fatalf("expected success for expectedVersion 0 on new key, got %v", err)
	}
}
