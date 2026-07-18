package starfish

import (
	"sync"
	"testing"
)

func TestIDGenerator_Sequential(t *testing.T) {
	var gen IDGenerator
	if got := gen.Next("msg"); got != "msg_1" {
		t.Errorf("first = %v, want msg_1", got)
	}
	if got := gen.Next("msg"); got != "msg_2" {
		t.Errorf("second = %v, want msg_2", got)
	}
	if got := gen.Next("hello"); got != "hello_3" {
		t.Errorf("third = %v, want hello_3", got)
	}
}

func TestIDGenerator_NextMessage(t *testing.T) {
	var gen IDGenerator
	if got := gen.NextMessage(); got != "msg_1" {
		t.Errorf("NextMessage() = %v, want msg_1", got)
	}
}

func TestIDGenerator_Concurrent(t *testing.T) {
	var gen IDGenerator
	const n = 1000

	var wg sync.WaitGroup
	ids := make([]string, n)
	for i := range n {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			ids[idx] = gen.Next("msg")
		}(i)
	}
	wg.Wait()

	// All IDs must be unique.
	seen := make(map[string]bool, n)
	for _, id := range ids {
		if seen[id] {
			t.Fatalf("duplicate ID: %s", id)
		}
		seen[id] = true
	}
}
