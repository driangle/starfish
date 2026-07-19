package starfish

import (
	"testing"
)

func TestParseDataResult(t *testing.T) {
	payload := map[string]any{
		"key":       "score",
		"scope":     "session",
		"data":      float64(42),
		"version":   float64(3),
		"op":        "replace",
		"updatedBy": "client_a",
	}

	r := parseDataResult(payload)

	if r.Key != "score" {
		t.Fatalf("unexpected key: %s", r.Key)
	}
	if r.Scope != ScopeSession {
		t.Fatalf("unexpected scope: %s", r.Scope)
	}
	if r.Data != float64(42) {
		t.Fatalf("unexpected data: %v", r.Data)
	}
	if r.Version != 3 {
		t.Fatalf("unexpected version: %d", r.Version)
	}
	if r.Op != OpReplace {
		t.Fatalf("unexpected op: %s", r.Op)
	}
	if r.From != "client_a" {
		t.Fatalf("unexpected from: %s", r.From)
	}
}

func TestParseDataResult_Nil(t *testing.T) {
	r := parseDataResult(nil)
	if r == nil {
		t.Fatal("expected non-nil result")
	}
	if r.Key != "" || r.Version != 0 {
		t.Fatalf("expected empty result, got %+v", r)
	}
}
